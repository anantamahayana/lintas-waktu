def test_invoice_open_shows_up_once_in_activity_and_can_be_read(client, admin):
    inv = client.post("/api/admin/invoices", headers=admin, json={"client_name": "Yunita", "items": [{"description": "Video", "qty": 1, "unit_price": 100}]}).json()
    client.post(f"/api/admin/invoices/{inv['id']}/status", headers=admin, json={"status": "sent"})
    client.get(f"/api/public/invoices/{inv['token']}")
    client.get(f"/api/public/invoices/{inv['token']}")  # again soon after: not repeated
    a = client.get("/api/admin/activity", headers=admin).json()
    opens = [x for x in a["items"] if x["kind"] == "invoice_open"]
    assert len(opens) == 1 and "Yunita" in opens[0]["title"] and a["unread"] >= 1
    assert client.post("/api/admin/activity/read", headers=admin).status_code == 204
    assert client.get("/api/admin/activity", headers=admin).json()["unread"] == 0
    assert client.get("/api/admin/activity").status_code in (401, 403)
