/**
 * Standalone tests: self-hosted OpenAI-compatible inference on a PRIVATE address.
 *
 * The reported gap (customer, 2026-07-21): provider config offered two shapes, and neither fit a
 * self-hosted OpenAI-compatible server on a cluster address
 * (`http://vllm.models.svc.cluster.local:8080`):
 *
 *   local    → Ollama wire protocol (`/api/chat`) — llama.cpp's llama-server does not speak it
 *   external → OpenAI wire protocol (`/chat/completions`) — right protocol, address rejected
 *
 * The shapes encode a PROTOCOL, not a trust level, which is why there was no way to express
 * "OpenAI-compatible, and it lives on my cluster".
 *
 * TWO enforcement points, and they behave differently — worth being precise about, because it decides
 * where the fix has to land:
 *
 *   - SAVE TIME (`isSsrfSafeUrl`) is a static string check. It rejects private IP LITERALS, but a DNS
 *     name like `*.svc.cluster.local` sails through — nothing has resolved it yet.
 *   - RESOLUTION TIME (`assertUrlSafeResolved`, inside `ssrfSafeFetch`) is what actually stops a cluster
 *     hostname: it resolves, then checks every returned address.
 *
 * So a config could save and only fail later at inference. `allowPrivateModelEndpoints` therefore has to
 * relax BOTH, and these tests cover both. What it must never relax is the crown jewels — loopback,
 * link-local / cloud IMDS, the metadata hostnames — which stay blocked at both points either way.
 *
 * Run: node --test testing/standalone/private-model-endpoints.test.js
 */

import { describe, it, before, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

let isSsrfSafeUrl;
let assertUrlSafeResolved;
let allowPrivateModelEndpoints;
let classifyEndpoint;

const ENV_KEY = 'YTHRIL_ALLOW_PRIVATE_MODEL_ENDPOINTS';
let savedEnv;

/** Private IP literals a self-hoster might configure directly. */
const PRIVATE_IPS = [
  'http://10.1.2.3:8080/v1',
  'http://192.168.1.50:11434',
  'http://172.16.0.9:8000',
];

/** Must stay blocked even with the flag on — these are what SSRF actually targets. */
const CROWN_JEWELS = [
  'http://127.0.0.1:8080',
  'http://localhost:8080',
  'http://169.254.169.254/latest/meta-data/',
  'http://metadata.google.internal/computeMetadata/v1/',
  'http://[::1]:8080',
  'http://0.0.0.0:8080',
];

/** The reporter's endpoint: a cluster DNS name that resolves to a private address. */
const CLUSTER_URL = 'http://vllm.models.svc.cluster.local:8080';
const resolvesTo = (address, family = 4) => async () => [{ address, family }];

describe('private model endpoints — operator opt-in', () => {
  before(async () => {
    ({ isSsrfSafeUrl, assertUrlSafeResolved } = await import('../../server/dist/util/ssrf.js'));
    ({ allowPrivateModelEndpoints } = await import('../../server/dist/config/model-egress-policy.js'));
    ({ classifyEndpoint } = await import('../../server/dist/config/model-egress-exposure.js'));
  });

  beforeEach(() => { savedEnv = process.env[ENV_KEY]; delete process.env[ENV_KEY]; });
  afterEach(() => { if (savedEnv === undefined) delete process.env[ENV_KEY]; else process.env[ENV_KEY] = savedEnv; });

  describe('the flag itself', () => {
    it('is OFF by default', () => {
      assert.equal(allowPrivateModelEndpoints(), false);
    });

    it('turns on from the environment', () => {
      process.env[ENV_KEY] = 'true';
      assert.equal(allowPrivateModelEndpoints(), true);
    });

    it('only the exact string "true" enables it', () => {
      for (const value of ['1', 'yes', 'TRUE', 'on', '']) {
        process.env[ENV_KEY] = value;
        assert.equal(allowPrivateModelEndpoints(), false, `"${value}" must not enable private endpoints`);
      }
    });
  });

  describe('save time — static URL admission', () => {
    it('rejects private IP literals by default', () => {
      for (const url of PRIVATE_IPS) assert.equal(isSsrfSafeUrl(url), false, `${url} rejected by default`);
    });

    it('accepts them once opted in', () => {
      for (const url of PRIVATE_IPS) assert.equal(isSsrfSafeUrl(url, true), true, `${url} permitted with opt-in`);
    });

    it('cannot judge a DNS name either way — that is resolution-time work', () => {
      // Documents why the fix cannot stop at save time: nothing has resolved this yet, so the static
      // check passes even with the flag off, and the config saves. The block comes later, at inference.
      assert.equal(isSsrfSafeUrl(CLUSTER_URL), true);
    });

    it('still blocks crown jewels — opt-in or not', () => {
      for (const url of CROWN_JEWELS) {
        assert.equal(isSsrfSafeUrl(url, false), false, `${url} blocked (default)`);
        assert.equal(isSsrfSafeUrl(url, true), false, `${url} STAYS blocked with the opt-in`);
      }
    });

    it('still rejects non-http(s) schemes and embedded credentials with the opt-in on', () => {
      for (const url of ['file:///etc/passwd', 'gopher://10.1.2.3/', 'http://user:pw@10.1.2.3/']) {
        assert.equal(isSsrfSafeUrl(url, true), false, `${url} rejected regardless of the opt-in`);
      }
    });

    it('leaves public endpoints working exactly as before', () => {
      for (const url of ['https://api.openai.com/v1', 'https://api.example.com:8443/v1']) {
        assert.equal(isSsrfSafeUrl(url), true);
        assert.equal(isSsrfSafeUrl(url, true), true);
      }
    });
  });

  describe('resolution time — what actually blocked the cluster endpoint', () => {
    it('blocks the cluster hostname by default, once resolved', async () => {
      await assert.rejects(
        () => assertUrlSafeResolved(CLUSTER_URL, { lookup: resolvesTo('10.1.2.3') }),
        /blocked address 10\.1\.2\.3/,
        'this is the failure the reporter actually hit',
      );
    });

    it('permits it with the opt-in', async () => {
      const { addresses } = await assertUrlSafeResolved(CLUSTER_URL, {
        lookup: resolvesTo('10.1.2.3'),
        allowPrivate: true,
      });
      assert.deepEqual(addresses, ['10.1.2.3']);
    });

    it('STILL blocks a hostname that resolves to loopback or IMDS, opt-in or not', async () => {
      for (const address of ['127.0.0.1', '169.254.169.254']) {
        await assert.rejects(
          () => assertUrlSafeResolved('http://evil.example.com/', { lookup: resolvesTo(address), allowPrivate: true }),
          /Blocked SSRF target/,
          `${address} must stay blocked even with the opt-in — this is the DNS-rebind case`,
        );
      }
    });

    it('keeps checking EVERY resolved address, not just the first', async () => {
      const multi = async () => [
        { address: '10.1.2.3', family: 4 },
        { address: '169.254.169.254', family: 4 }, // smuggled alongside a legitimate one
      ];
      await assert.rejects(
        () => assertUrlSafeResolved(CLUSTER_URL, { lookup: multi, allowPrivate: true }),
        /169\.254\.169\.254/,
      );
    });
  });

  describe('cloud metadata is a different risk class from RFC-1918 private', () => {
    // Reviewer catch, and it was a real hole: two metadata endpoints live INSIDE ranges that the
    // opt-in deliberately opens, so before the carve-outs, enabling private endpoints made them
    // reachable again — the single highest-value SSRF target on those hosts.
    //
    //   fd00:ec2::254    AWS IPv6 IMDS, inside fd00::/8 unique-local
    //   100.100.100.200  Alibaba Cloud IMDS, inside 100.64.0.0/10 CGNAT
    //
    // Nobody enabling "reach my 10.43.x.x cluster service" is asking for those.
    const METADATA = [
      ['http://[fd00:ec2::254]/latest/meta-data/', 'AWS IPv6 IMDS'],
      ['http://[fd00:ec2::]/', 'AWS IPv6 IMDS prefix'],
      ['http://100.100.100.200/latest/meta-data/', 'Alibaba Cloud IMDS'],
      ['http://169.254.169.254/', 'IMDS (IPv4)'],
      ['http://metadata.google.internal/', 'GCP metadata hostname'],
    ];

    for (const [url, label] of METADATA) {
      it(`blocks ${label} even with the opt-in on`, () => {
        assert.equal(isSsrfSafeUrl(url, true), false, `${url} must stay blocked`);
        assert.equal(isSsrfSafeUrl(url, false), false);
      });
    }

    it('still permits legitimate addresses in those same ranges', () => {
      // The carve-outs must be surgical: a real ULA or CGNAT service stays reachable.
      for (const url of ['http://[fd12:3456::1]:8080', 'http://100.64.1.1:8080', 'http://100.100.100.100/']) {
        assert.equal(isSsrfSafeUrl(url, true), true, `${url} is a legitimate private address`);
      }
    });

    it('blocks a hostname that RESOLVES to a metadata endpoint, opt-in on', async () => {
      for (const address of ['169.254.169.254', '100.100.100.200']) {
        await assert.rejects(
          () => assertUrlSafeResolved('http://inference.internal/', { lookup: resolvesTo(address), allowPrivate: true }),
          /Blocked SSRF target/,
          `${address} must stay blocked at resolution time too`,
        );
      }
    });
  });

  describe('posture reports effective exposure, not intent', () => {
    // "allowPrivate is on" states the flag; "vision → 10.1.2.3 (private)" states the exposure. The
    // second is what makes the check load-bearing, since widening egress is the whole reason it exists.
    it('classifies a private literal, a public one, and a hostname distinctly', () => {
      assert.deepEqual(classifyEndpoint('http://10.1.2.3:8080'), { host: '10.1.2.3', klass: 'private' });
      assert.deepEqual(classifyEndpoint('https://140.82.121.4/v1'), { host: '140.82.121.4', klass: 'public' });
      // Honest about what a static check cannot know: a hostname is a hostname until it resolves.
      assert.deepEqual(classifyEndpoint('https://api.example.com/v1'), { host: 'api.example.com', klass: 'hostname' });
    });

    it('marks a crown-jewel endpoint invalid, not private — it is unreachable either way', () => {
      for (const url of ['http://169.254.169.254/', 'http://100.100.100.200/', 'http://[fd00:ec2::254]/']) {
        assert.equal(classifyEndpoint(url).klass, 'invalid', url);
      }
    });

    it('does not throw on an unparseable endpoint', () => {
      assert.equal(classifyEndpoint('not a url').klass, 'invalid');
    });
  });
});
