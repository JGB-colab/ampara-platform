def test_index_serves_dashboard_html(client) -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert "Ampara" in response.text
    assert "/static/logo.jpg" in response.text


def test_static_serves_logo(client) -> None:
    response = client.get("/static/logo.jpg")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("image/")


def test_coletor_page_served(client) -> None:
    response = client.get("/coletor")

    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert "Web Bluetooth" in response.text
