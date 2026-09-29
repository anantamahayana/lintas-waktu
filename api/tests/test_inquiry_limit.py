import pytest

from app.config import get_settings
from app.content import router_public


@pytest.fixture(autouse=True)
def _fresh_limits():
    router_public._inquiry_hits.clear()
    yield
    router_public._inquiry_hits.clear()


def _send(client, headers=None):
    body = {"name": "Dewi", "email": "dewi@contoh.com", "kind": "wedding", "message": "Halo"}
    return client.post("/api/public/inquiries", json=body, headers=headers or {})


def test_inquiry_limit_counts_each_visitor_forwarded_by_the_site(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "revalidate_secret", "rahasia-tes")
    for _ in range(5):
        assert _send(client, {"x-visitor-ip": "1.1.1.1", "x-visitor-key": "rahasia-tes"}).status_code == 201
    assert _send(client, {"x-visitor-ip": "1.1.1.1", "x-visitor-key": "rahasia-tes"}).status_code == 429
    # another visitor behind the same site server is not blocked
    assert _send(client, {"x-visitor-ip": "2.2.2.2", "x-visitor-key": "rahasia-tes"}).status_code == 201


def test_visitor_address_without_the_secret_is_ignored(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "revalidate_secret", "rahasia-tes")
    for n in range(5):
        assert _send(client, {"x-visitor-ip": f"9.9.9.{n}", "x-visitor-key": "salah"}).status_code == 201
    assert _send(client, {"x-visitor-ip": "9.9.9.99"}).status_code == 429
