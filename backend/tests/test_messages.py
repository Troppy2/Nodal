"""Direct messages: an invite is a DM, the follow-up is a nudge, and both sides see one thread."""

P = "/api/v1"


def skill_id(client, name):
    return next(s["id"] for s in client.get(f"{P}/skills").json() if s["name"] == name)


def make_project(client, user, **extra):
    body = {"title": "Thread lamp", "summary": "A lamp with a thread.", "type": "hardware",
            "stage": "building", "tags": [], "needs": [], **extra}
    r = client.post(f"{P}/projects", json=body, headers=user["headers"])
    assert r.status_code == 201, r.text
    return r.json()


def test_invite_is_a_dm_and_can_be_followed_up(client, new_user):
    owner, guest = new_user(), new_user()
    sid = skill_id(client, "Sound design")
    p = make_project(client, owner, needs=[{"skill_id": sid, "note": "loops"}])
    url = f"{P}/messages/{guest['id']}/invite"

    # Only the project owner can invite, and never themselves.
    assert client.post(f"{P}/messages/{owner['id']}/invite", json={"project_id": p["id"]},
                       headers=guest["headers"]).status_code == 403
    assert client.post(f"{P}/messages/{owner['id']}/invite", json={"project_id": p["id"]},
                       headers=owner["headers"]).status_code == 422

    sent = client.post(url, json={"project_id": p["id"], "skill_id": sid, "body": None}, headers=owner["headers"])
    assert sent.status_code == 201, sent.text
    invite = sent.json()
    assert invite["kind"] == "invite" and invite["mine"] is True and "Sound design" in invite["body"]

    # The same message is the owner's confirmation and the guest's DM.
    owner_convos = client.get(f"{P}/me/conversations", headers=owner["headers"]).json()
    guest_convos = client.get(f"{P}/me/conversations", headers=guest["headers"]).json()
    assert owner_convos[0]["profile"]["id"] == guest["id"] and owner_convos[0]["last_kind"] == "invite"
    assert guest_convos[0]["profile"]["id"] == owner["id"] and guest_convos[0]["unread"] == 1

    # Opening the thread marks it read.
    thread = client.get(f"{P}/messages/{owner['id']}", headers=guest["headers"]).json()
    assert [m["kind"] for m in thread["messages"]] == ["invite"]
    assert thread["project"]["id"] == p["id"] and thread["messages"][0]["mine"] is False
    assert client.get(f"{P}/me/conversations", headers=guest["headers"]).json()[0]["unread"] == 0

    # One invite, then one follow-up, then it waits on the guest.
    assert client.post(url, json={"project_id": p["id"]}, headers=owner["headers"]).status_code == 409
    nudge = client.post(f"{P}/messages/{guest['id']}/nudge", headers=owner["headers"])
    assert nudge.status_code == 201 and nudge.json()["kind"] == "nudge"
    assert client.post(f"{P}/messages/{guest['id']}/nudge", headers=owner["headers"]).status_code == 409
    assert client.post(url, json={"project_id": p["id"]}, headers=owner["headers"]).status_code == 409
    assert client.get(f"{P}/messages/{guest['id']}", headers=owner["headers"]).json()["can_nudge"] is False

    # The guest replies; the owner's thread sees it and stops offering a follow-up.
    reply = client.post(f"{P}/messages", json={"to_profile_id": owner["id"], "body": "  On it  "},
                        headers=guest["headers"])
    assert reply.status_code == 201 and reply.json()["mine"] is True and reply.json()["body"] == "On it"
    owner_thread = client.get(f"{P}/messages/{guest['id']}", headers=owner["headers"]).json()
    assert [m["kind"] for m in owner_thread["messages"]] == ["invite", "nudge", "text"]
    assert owner_thread["messages"][-1]["mine"] is False
    assert owner_thread["can_nudge"] is False
