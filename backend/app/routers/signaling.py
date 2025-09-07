from fastapi import APIRouter, WebSocket, Query, HTTPException, status
from ..signaling import websocket_endpoint
from ..core.config import supabase

router = APIRouter()

async def authenticate_websocket_user(token: str):
    """Authenticate user from WebSocket token"""
    try:
        response = supabase.auth.get_user(token)
        if not response.user:
            return None
        return response.user
    except Exception as e:
        print(f"WebSocket auth error: {str(e)}")
        return None

@router.websocket("/ws/signaling/{room_id}")
async def websocket_signaling_endpoint(
    websocket: WebSocket, 
    room_id: str,
    token: str = Query(..., description="Authentication token"),
    user_id: str = Query(None),
    participant_type: str = Query("human")
):
    """Enhanced WebSocket endpoint for multi-user meeting rooms with participant tracking"""
    # Authenticate user before accepting connection
    user = await authenticate_websocket_user(token)
    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Authentication failed")
        return
    
    # Use authenticated user ID if not provided
    if not user_id:
        user_id = user.id
    
    await websocket_endpoint(websocket, room_id, user_id, participant_type)