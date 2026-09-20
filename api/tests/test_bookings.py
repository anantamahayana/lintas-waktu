"""Calendar: ranges, conflicts, public availability, invoice linkage."""


def _book(client, admin, **over):
    body = {"title": "Ayu & Marco", "kind": "wedding", "status": "booked", "start_date": "2027-06-14"}
    body.update(over)
    r = client.post("/api/admin/bookings", headers=admin, json=body)
    assert r.status_code == 201, r.text
    return r.json()


def test_conflicts_are_reported_not_blocked(client, admin):
    _book(client, admin)
    b = _book(client, admin, title="Nadia & Tom", status="tentative")
    assert b["conflicts"] == ["Ayu & Marco"]


def test_bad_ranges_rejected(client, admin):
    r = client.post("/api/admin/bookings", headers=admin, json={"title": "x", "start_date": "2027-06-14", "end_date": "2027-06-10"})
    assert r.status_code == 422


def test_invoice_money_confirms_the_booking(client, admin):
    inv = client.post("/api/admin/invoices", headers=admin, json={"client_name": "Ayu & Marco", "items": [{"description": "Wedding", "qty": 1, "unit_price": 100}], "deposit_paid": 50}).json()
    b = _book(client, admin, status="tentative", invoice_id=inv["id"])
    client.post(f"/api/admin/invoices/{inv['id']}/status", headers=admin, json={"status": "sent"})
    assert client.get(f"/api/admin/bookings/{b['id']}", headers=admin).json()["status"] == "booked"
    client.post(f"/api/admin/invoices/{inv['id']}/status", headers=admin, json={"status": "void"})
    assert client.get(f"/api/admin/bookings/{b['id']}", headers=admin).json()["status"] == "cancelled"
