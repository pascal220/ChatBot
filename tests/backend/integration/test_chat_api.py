"""Integration tests for chat sessions and messages API."""

import pytest
from httpx import AsyncClient


async def _register_and_token(client: AsyncClient, suffix: str = "") -> str:
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "email": f"chat{suffix}@example.com",
            "username": f"chatuser{suffix}",
            "password": "password123",
        },
    )
    return resp.json()["access_token"]


@pytest.mark.asyncio
async def test_create_and_list_sessions(client: AsyncClient):
    token = await _register_and_token(client, "1")
    headers = {"Authorization": f"Bearer {token}"}

    create_resp = await client.post(
        "/api/v1/chat/sessions", json={"title": "My First Chat"}, headers=headers
    )
    assert create_resp.status_code == 201
    session_id = create_resp.json()["id"]

    list_resp = await client.get("/api/v1/chat/sessions", headers=headers)
    assert list_resp.status_code == 200
    ids = [s["id"] for s in list_resp.json()]
    assert session_id in ids


@pytest.mark.asyncio
async def test_rename_session(client: AsyncClient):
    token = await _register_and_token(client, "2")
    headers = {"Authorization": f"Bearer {token}"}

    session = (
        await client.post("/api/v1/chat/sessions", json={"title": "Old"}, headers=headers)
    ).json()
    resp = await client.patch(
        f"/api/v1/chat/sessions/{session['id']}", json={"title": "New"}, headers=headers
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "New"


@pytest.mark.asyncio
async def test_delete_session(client: AsyncClient):
    token = await _register_and_token(client, "3")
    headers = {"Authorization": f"Bearer {token}"}

    session = (
        await client.post("/api/v1/chat/sessions", json={"title": "TBD"}, headers=headers)
    ).json()
    del_resp = await client.delete(f"/api/v1/chat/sessions/{session['id']}", headers=headers)
    assert del_resp.status_code == 204

    list_resp = await client.get("/api/v1/chat/sessions", headers=headers)
    assert all(s["id"] != session["id"] for s in list_resp.json())


@pytest.mark.asyncio
async def test_list_messages_empty(client: AsyncClient):
    token = await _register_and_token(client, "4")
    headers = {"Authorization": f"Bearer {token}"}

    session = (
        await client.post("/api/v1/chat/sessions", json={"title": "Empty"}, headers=headers)
    ).json()
    resp = await client.get(
        f"/api/v1/chat/sessions/{session['id']}/messages", headers=headers
    )
    assert resp.status_code == 200
    assert resp.json() == []
