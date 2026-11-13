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


def test_verify_code_matches_only_the_issued_document(client, admin):
    inv = _new(client, admin)
    assert client.get(f"/api/public/verify/{inv['number']}", params={"c": inv["verify_code"]}).json()["reason"] == "unknown"  # drafts don't count
    client.post(f"/api/admin/invoices/{inv['id']}/status", headers=admin, json={"status": "sent"})
    ok = client.get(f"/api/public/verify/{inv['number']}", params={"c": inv["verify_code"].lower().replace("-", "")}).json()
    assert ok["valid"] and ok["client_name"] == "Ayu & Marco" and ok["total"] == 29800000 and "bank_details" in ok["business"]
    bad = client.get(f"/api/public/verify/{inv['number']}", params={"c": "AAAA-BBBB"}).json()
    assert not bad["valid"] and bad["reason"] == "no_match" and bad.get("client_name") is None
    # editing the total after sending invalidates the old code (an old PDF no longer verifies)
    client.patch(f"/api/admin/invoices/{inv['id']}", headers=admin, json={"items": [{"description": "Wedding", "qty": 1, "unit_price": 1}]})
    assert client.get(f"/api/public/verify/{inv['number']}", params={"c": inv["verify_code"]}).json()["reason"] == "no_match"


def test_events_record_the_trail_and_sent_hash_is_kept(client, admin):
    inv = _new(client, admin)
    client.post(f"/api/admin/invoices/{inv['id']}/status", headers=admin, json={"status": "sent"})
    client.patch(f"/api/admin/invoices/{inv['id']}", headers=admin, json={"notes": "changed"})
    ev = client.get(f"/api/admin/invoices/{inv['id']}/events", headers=admin).json()
    assert [e["action"] for e in ev] == ["updated", "sent", "created"]
    assert ev[0]["detail"]["fields"] == ["notes"] and ev[0]["detail"]["after_sent"] is True
    cur = client.get(f"/api/admin/invoices/{inv['id']}", headers=admin).json()
    assert cur["sent_hash"] and cur["sent_hash"] != cur["current_hash"]
    assert client.delete(f"/api/admin/invoices/{inv['id']}", headers=admin).status_code == 400  # issued → void, never delete


def test_default_notes_follow_the_document_language(client, admin):
    assert _new(client, admin, lang="id")["notes"].startswith("DP 50%")
    assert _new(client, admin)["notes"].startswith("50% booking fee")
    assert _new(client, admin, lang="id", notes="Tulisan sendiri")["notes"] == "Tulisan sendiri"


def test_payments_build_up_to_paid_with_receipts(client, admin):
    inv = _new(client, admin, items=[{"description": "Video", "qty": 1, "unit_price": 1500000}], deposit_paid=0, client_phone="0812-3456-7890", lang="id")
    assert inv["client_wa"] == "6281234567890"
    r = client.post(f"/api/admin/invoices/{inv['id']}/payments", headers=admin, json={"amount": 750000, "method": "transfer"})
    assert r.status_code == 201, r.text
    d = r.json()
    assert d["status"] == "sent" and d["totals"]["balance"] == 750000 and d["payments"][0]["receipt_no"].startswith("KW-")
    assert client.post(f"/api/admin/invoices/{inv['id']}/payments", headers=admin, json={"amount": 800000}).status_code == 400
    d = client.post(f"/api/admin/invoices/{inv['id']}/payments", headers=admin, json={"amount": 750000}).json()
    assert d["status"] == "paid" and d["totals"]["balance"] == 0 and len(d["payments"]) == 2
    tok = d["payments"][0]["receipt_url"].rsplit("/", 1)[1]
    rc = client.get(f"/api/public/receipts/{tok}").json()
    assert rc["amount"] == 750000 and rc["balance_after"] == 750000 and rc["lang"] == "id"
    d = client.delete(f"/api/admin/invoices/{inv['id']}/payments/{d['payments'][1]['id']}", headers=admin).json()
    assert d["status"] == "sent" and d["totals"]["balance"] == 750000


def test_old_deposit_becomes_first_payment_and_mark_paid_records_rest(client, admin):
    inv = _new(client, admin)  # deposit_paid 14 000 000 typed by hand
    client.post(f"/api/admin/invoices/{inv['id']}/status", headers=admin, json={"status": "sent"})
    d = client.post(f"/api/admin/invoices/{inv['id']}/status", headers=admin, json={"status": "paid"}).json()
    assert [p["amount"] for p in d["payments"]] == [14000000, 15800000] and d["totals"]["balance"] == 0
