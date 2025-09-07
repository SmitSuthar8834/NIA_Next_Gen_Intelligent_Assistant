"""
Question Service for AI Meeting System

Handles question set management and dynamic question generation
"""

import logging
from typing import Dict, List, Optional, Any
from ..core.config import supabase
from .gemini import gemini_service

logger = logging.getLogger(__name__)

class QuestionService:
    """Service for managing meeting questions and question sets"""
    
    def __init__(self):
        pass
        
    async def generate_questions_for_lead(
        self, 
        lead_data: Dict[str, Any], 
        question_set_id: Optional[str] = None
    ) -> List[str]:
        """Generate questions for a specific lead"""
        try:
            # If question set ID provided, get questions from that set
            if question_set_id:
                questions = await self._get_questions_from_set(question_set_id)
                if questions:
                    return questions
                    
            # Otherwise, use AI to generate personalized questions
            return await gemini_service.generate_questions_for_lead(lead_data, question_set_id)
            
        except Exception as e:
            logger.error(f"Failed to generate questions for lead: {e}")
            return self._get_default_questions()
            
    async def _get_questions_from_set(self, question_set_id: str) -> List[str]:
        """Get questions from a specific question set"""
        try:
            response = supabase.table("questions").select("question_text").eq("question_set_id", question_set_id).order("order_index").execute()
            
            if response.data:
                return [q["question_text"] for q in response.data]
                
            return []
            
        except Exception as e:
            logger.error(f"Failed to get questions from set {question_set_id}: {e}")
            return []
            
    async def get_default_question_set(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get the default question set for a user"""
        try:
            response = supabase.table("question_sets").select("*").eq("user_id", user_id).eq("is_default", True).execute()
            
            if response.data:
                return response.data[0]
                
            return None
            
        except Exception as e:
            logger.error(f"Failed to get default question set for user {user_id}: {e}")
            return None
            
    async def get_question_set(self, question_set_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific question set"""
        try:
            response = supabase.table("question_sets").select("*").eq("id", question_set_id).eq("user_id", user_id).execute()
            
            if response.data:
                return response.data[0]
                
            return None
            
        except Exception as e:
            logger.error(f"Failed to get question set {question_set_id}: {e}")
            return None

    async def get_user_question_sets(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all question sets for a user"""
        try:
            response = supabase.table("question_sets").select("*").eq("user_id", user_id).order("is_default", desc=True).order("created_at", desc=True).execute()
            
            return response.data or []
            
        except Exception as e:
            logger.error(f"Failed to get question sets for user {user_id}: {e}")
            return []

    async def create_default_question_set(self, user_id: str) -> Dict[str, Any]:
        """Create a default question set for a new user"""
        try:
            # Create question set
            question_set_data = {
                "user_id": user_id,
                "name": "Default Discovery Questions",
                "description": "Standard discovery questions for lead qualification",
                "is_default": True,
                "question_count": 7
            }
            
            response = supabase.table("question_sets").insert(question_set_data).execute()
            
            if not response.data:
                raise Exception("Failed to create question set")
                
            question_set = response.data[0]
            question_set_id = question_set["id"]
            
            # Create default questions
            default_questions = self._get_default_questions()
            
            questions_data = []
            for i, question_text in enumerate(default_questions):
                questions_data.append({
                    "question_set_id": question_set_id,
                    "question_text": question_text,
                    "order_index": i + 1,
                    "is_required": True
                })
                
            supabase.table("questions").insert(questions_data).execute()
            
            logger.info(f"Created default question set for user {user_id}")
            return question_set
            
        except Exception as e:
            logger.error(f"Failed to create default question set for user {user_id}: {e}")
            raise
            
    def _get_default_questions(self) -> List[str]:
        """Get the default set of discovery questions"""
        return [
            "Can you tell me about your company and what you do?",
            "What are the main challenges you're facing in your business right now?",
            "How are you currently handling these challenges?",
            "What would an ideal solution look like for you?",
            "What's your timeline for making a decision on this?",
            "Who else would be involved in the decision-making process?",
            "What budget range are you working with for this project?"
        ]

# Global question service instance
question_service = QuestionService()