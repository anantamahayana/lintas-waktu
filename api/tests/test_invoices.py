"""Invoices: numbering, totals, draft visibility, paid lock."""


def _new(client, admin, **over):
    body = {"client_name": "Ayu & Marco", "items": [{"description": "Wedding", "qty": 1, "unit_price": 28000000}, {"description": "Extra", "qty": 12, "unit_price": 150000}], "deposit_paid": 14000000}
    body.update(over)
    r = client.post("/api/admin/invoices", headers=admin, json=body)
    assert r.status_code == 201, r.text
    return r.json()


def test_numbers_run_per_year_and_totals_add_up(client, admin):
    a = _new(client, admin)
    b = _new(client, admin)
    assert a["number"].endswith("-0001") and b["number"].endswith("-0002")
    t = a["totals"]
    assert t["subtotal"] == 29800000 and t["total"] == 29800000 and t["balance"] == 15800000


def test_discount_and_tax(client, admin):
    inv = _new(client, admin, discount=800000, tax_percent=10, deposit_paid=0)
    t = inv["totals"]
    assert t["taxable"] == 29000000 and t["tax"] == 2900000 and t["total"] == 31900000


def test_draft_is_hidden_from_client_until_sent(client, admin):
    inv = _new(client, admin)
    assert client.get(f"/api/public/invoices/{inv['token']}").status_code == 404
    client.post(f"/api/admin/invoices/{inv['id']}/status", headers=admin, json={"status": "sent"})
    r = client.get(f"/api/public/invoices/{inv['token']}")
    assert r.status_code == 200
    assert "prefix" not in r.json()["business"]  # internals stay private


def test_paid_invoice_is_locked_and_kept(client, admin):
    inv = _new(client, admin)
    r = client.post(f"/api/admin/invoices/{inv['id']}/status", headers=admin, json={"status": "paid"})
    assert r.json()["totals"]["balance"] == 0
    assert client.patch(f"/api/admin/invoices/{inv['id']}", headers=admin, json={"client_name": "x"}).status_code == 400
    assert client.delete(f"/api/admin/invoices/{inv['id']}", headers=admin).status_code == 400


def test_duplicate_makes_a_fresh_draft(client, admin):
    inv = _new(client, admin)
    client.post(f"/api/admin/invoices/{inv['id']}/status", headers=admin, json={"status": "paid"})
    r = client.post(f"/api/admin/invoices/{inv['id']}/duplicate", headers=admin)
    assert r.status_code == 201 and r.json()["status"] == "draft" and r.json()["number"] != inv["number"]
