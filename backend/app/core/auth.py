from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from .config import settings, supabase

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Validate Supabase JWT token and return current user
    """
    try:
        token = credentials.credentials
        
        # Verify JWT token with Supabase
        try:
            response = supabase.auth.get_user(token)
            if not response.user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User not found in token",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            return response.user
            
        except Exception as supabase_error:
            print(f"Supabase auth error: {str(supabase_error)}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Supabase auth error: {str(supabase_error)}",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
    except Exception as e:
        print(f"Authentication error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication error: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )