import pytest


def test_get_activities(client):
    res = client.get("/activities")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, dict)
    # Expect some known activities from initial dataset
    assert "Chess Club" in data


def test_signup_success(client):
    email = "testuser@mergington.edu"
    activity = "Chess Club"

    res = client.post(f"/activities/{activity}/signup", params={"email": email})
    assert res.status_code == 200
    payload = res.json()
    assert "Signed up" in payload.get("message", "")
    assert email in payload.get("participants", [])


def test_signup_already_enrolled(client):
    # use an existing participant from initial data
    activity = "Chess Club"
    existing = "michael@mergington.edu"

    res = client.post(f"/activities/{activity}/signup", params={"email": existing})
    assert res.status_code == 400
    assert "already enrolled" in res.json().get("detail", "").lower()


def test_signup_full(client):
    # create a tiny activity with capacity 1 and one participant
    activity_name = "Tiny Club"
    _max = 1
    from src.app import activities

    activities[activity_name] = {
        "description": "Tiny activity",
        "schedule": "Now",
        "max_participants": _max,
        "participants": ["a@mergington.edu"],
    }

    res = client.post(f"/activities/{activity_name}/signup", params={"email": "b@mergington.edu"})
    assert res.status_code == 400
    assert "full" in res.json().get("detail", "").lower()


def test_remove_participant_success(client):
    activity = "Programming Class"
    email = "emma@mergington.edu"

    # remove existing
    res = client.delete(f"/activities/{activity}/participants", params={"email": email})
    assert res.status_code == 200
    payload = res.json()
    assert email not in payload.get("participants", [])


def test_remove_participant_not_enrolled(client):
    activity = "Programming Class"
    email = "notfound@mergington.edu"

    res = client.delete(f"/activities/{activity}/participants", params={"email": email})
    assert res.status_code == 400
    assert "not enrolled" in res.json().get("detail", "").lower()


def test_remove_activity_not_found(client):
    res = client.delete("/activities/NoActivity/participants", params={"email": "x@a.com"})
    assert res.status_code == 404
