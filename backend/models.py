from pydantic import BaseModel, Field
from typing import Optional

class OverlayModel(BaseModel):
    type: str = Field(..., description="text or image")
    content: str = Field(..., description="Text content or Image URL")
    x: int = Field(0, description="X coordinate")
    y: int = Field(0, description="Y coordinate")
    width: int = Field(100, description="Width of overlay")
    height: int = Field(50, description="Height of overlay")

class UpdateOverlayModel(BaseModel):
    # Ensure these are all Optional and use int
    type: Optional[str] = None
    content: Optional[str] = None
    x: Optional[int] = None
    y: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None