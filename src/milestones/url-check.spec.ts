import { isReachable, isWellFormedUrl } from './url-check';

describe('isWellFormedUrl', () => {
  it('accepts http/https URLs', () => {
    expect(isWellFormedUrl('https://example.com/repo')).toBe(true);
    expect(isWellFormedUrl('http://example.com')).toBe(true);
  });

  it('rejects malformed or non-http(s) input', () => {
    expect(isWellFormedUrl('not a url')).toBe(false);
    expect(isWellFormedUrl('javascript:alert(1)')).toBe(false);
    expect(isWellFormedUrl('ftp://example.com')).toBe(false);
  });
});

describe('isReachable', () => {
  it('returns true when the mocked HEAD request succeeds', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: true });
    await expect(isReachable('https://example.com', fetchImpl)).resolves.toBe(
      true,
    );
    expect(fetchImpl).toHaveBeenCalledWith('https://example.com', {
      method: 'HEAD',
    });
  });

  it('returns false when the mocked HEAD request returns non-2xx', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: false });
    await expect(
      isReachable('https://example.com/missing', fetchImpl),
    ).resolves.toBe(false);
  });

  it('returns false when the request throws (network failure), never crashes', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new Error('network down'));
    await expect(isReachable('https://example.com', fetchImpl)).resolves.toBe(
      false,
    );
  });

  it('never makes a network call for a malformed URL', async () => {
    const fetchImpl = jest.fn();
    await expect(isReachable('not a url', fetchImpl)).resolves.toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('never makes a network call to loopback, private, or link-local hosts (SSRF guard)', async () => {
    const fetchImpl = jest.fn();
    const blocked = [
      'http://localhost/admin',
      'http://127.0.0.1:8080',
      'http://10.0.0.5/internal',
      'http://172.16.0.1',
      'http://192.168.1.1',
      'http://169.254.169.254/latest/meta-data/',
      'http://[::1]/',
      'http://0.0.0.0',
    ];

    for (const url of blocked) {
      await expect(isReachable(url, fetchImpl)).resolves.toBe(false);
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
