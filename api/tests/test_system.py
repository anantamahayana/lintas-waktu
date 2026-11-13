def test_system_status_needs_admin_and_warns_without_backups(client, admin):
    assert client.get("/api/admin/system").status_code in (401, 403)
    d = client.get("/api/admin/system", headers=admin).json()
    assert d["database"] == "ok" and d["disk_free_mb"] > 0
    assert any("off-server" in w for w in d["warnings"])
