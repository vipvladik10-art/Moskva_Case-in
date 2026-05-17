from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()


@router.websocket("/ws/dashboard")
async def ws_dashboard(websocket: WebSocket) -> None:
    """TODO(P1, S3): pub/sub через Redis + подписка по топикам.

    Сейчас — эхо для теста соединения.
    """
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            await websocket.send_json({"type": "ack", "received": data})
    except WebSocketDisconnect:
        return
