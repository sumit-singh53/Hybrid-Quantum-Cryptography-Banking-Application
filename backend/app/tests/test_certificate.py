def test_certificate_details(client):
    response = client.get("/api/certificates/details")
    assert response.status_code == 200

    data = response.get_json()
    assert "certificate_id" in data
    assert "issued_by" in data
    assert "algorithm" in data


def test_certificate_status(client):
    response = client.get("/api/certificates/status")
    assert response.status_code == 200

    data = response.get_json()
    assert data["state"] in ["ACTIVE", "EXPIRED", "REVOKED"]
