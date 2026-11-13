def test_records_with_the_same_number_or_name_form_one_client(client, admin):
    client.post("/api/admin/invoices", headers=admin, json={"client_name": "Yunita", "client_phone": "0812 1111 2222", "items": [{"description": "Video", "qty": 1, "unit_price": 1500000}]})
    client.post("/api/admin/invoices", headers=admin, json={"client_name": "Yunita Sari", "client_phone": "+62 812-1111-2222", "items": [{"description": "Drone", "qty": 1, "unit_price": 500000}]})
    client.post("/api/admin/invoices", headers=admin, json={"client_name": "Made", "items": [{"description": "Photo", "qty": 1, "unit_price": 1}]})
    rows = client.get("/api/admin/clients", headers=admin).json()
    yun = [c for c in rows if c["wa"] == "6281211112222"]
    assert len(yun) == 1 and yun[0]["counts"]["invoice"] == 2
    d = client.get(f"/api/admin/clients/{yun[0]['id']}", headers=admin).json()
    assert set(d["names"]) == {"Yunita", "Yunita Sari"} and len(d["items"]) == 2
    assert client.get("/api/admin/clients/nope", headers=admin).status_code == 404
