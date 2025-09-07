from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Dict, Any, Optional
import logging
from ..core.auth import get_current_user
from ..services.question_service import question_service
from ..models.enhanced_schemas import (
    QuestionSet, QuestionSetCreate, QuestionSetUpdate, QuestionSetWithQuestions,
    Question, QuestionCreate, QuestionUpdate, BulkQuestionCreate, BulkQuestionUpdate
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/question-sets", tags=["question-sets"])

# Question Set Management
@router.post("/", response_model=QuestionSet)
async def create_question_set(
    question_set_data: QuestionSetCreate,
    current_user=Depends(get_current_user)
):
    """Create a new question set"""
    try:
        question_set, success = await question_service.create_question_set(
            current_user.id, 
            question_set_data
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create question set"
            )
        
        return question_set
        
    except Exception as e:
        logger.error(f"Error creating question set: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/", response_model=List[QuestionSet])
async def get_question_sets(
    current_user=Depends(get_current_user)
):
    """Get all question sets for the current user"""
    try:
        question_sets = await question_service.get_user_question_sets(current_user.id)
        return question_sets
        
    except Exception as e:
        logger.error(f"Error getting question sets: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/default", response_model=Optional[QuestionSet])
async def get_default_question_set(
    current_user=Depends(get_current_user)
):
    """Get the default question set for the current user"""
    try:
        question_set = await question_service.get_default_question_set(current_user.id)
        return question_set
        
    except Exception as e:
        logger.error(f"Error getting default question set: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.post("/default", response_model=QuestionSet)
async def create_default_question_set(
    current_user=Depends(get_current_user)
):
    """Create a default question set with standard questions"""
    try:
        question_set, success = await question_service.create_default_question_set(current_user.id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create default question set"
            )
        
        return question_set
        
    except Exception as e:
        logger.error(f"Error creating default question set: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/{question_set_id}", response_model=QuestionSetWithQuestions)
async def get_question_set_with_questions(
    question_set_id: str,
    current_user=Depends(get_current_user)
):
    """Get a question set with all its questions"""
    try:
        question_set = await question_service.get_question_set(question_set_id, current_user.id)
        
        if not question_set:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Question set not found"
            )
        
        questions = await question_service.get_questions_by_set(question_set_id, current_user.id)
        
        # Create response with questions included
        question_set_dict = question_set.model_dump()
        question_set_dict["questions"] = questions
        
        return QuestionSetWithQuestions(**question_set_dict)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting question set with questions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.put("/{question_set_id}", response_model=QuestionSet)
async def update_question_set(
    question_set_id: str,
    update_data: QuestionSetUpdate,
    current_user=Depends(get_current_user)
):
    """Update a question set"""
    try:
        question_set, success = await question_service.update_question_set(
            question_set_id, current_user.id, update_data
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update question set"
            )
        
        return question_set
        
    except Exception as e:
        logger.error(f"Error updating question set: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.delete("/{question_set_id}")
async def delete_question_set(
    question_set_id: str,
    current_user=Depends(get_current_user)
):
    """Delete a question set and all its questions"""
    try:
        success = await question_service.delete_question_set(question_set_id, current_user.id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to delete question set"
            )
        
        return {"message": "Question set deleted successfully"}
        
    except Exception as e:
        logger.error(f"Error deleting question set: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

# Question Management
@router.post("/{question_set_id}/questions", response_model=Question)
async def create_question(
    question_set_id: str,
    question_data: QuestionCreate,
    current_user=Depends(get_current_user)
):
    """Create a new question in a question set"""
    try:
        # Ensure the question_set_id matches
        question_data.question_set_id = question_set_id
        
        question, success = await question_service.create_question(question_data)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create question"
            )
        
        return question
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error creating question: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/{question_set_id}/questions", response_model=List[Question])
async def get_questions(
    question_set_id: str,
    current_user=Depends(get_current_user)
):
    """Get all questions for a question set"""
    try:
        questions = await question_service.get_questions_by_set(question_set_id, current_user.id)
        return questions
        
    except Exception as e:
        logger.error(f"Error getting questions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.put("/{question_set_id}/questions/{question_id}", response_model=Question)
async def update_question(
    question_set_id: str,
    question_id: str,
    update_data: QuestionUpdate,
    current_user=Depends(get_current_user)
):
    """Update a question"""
    try:
        question, success = await question_service.update_question(
            question_id, current_user.id, update_data
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update question"
            )
        
        return question
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error updating question: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.delete("/{question_set_id}/questions/{question_id}")
async def delete_question(
    question_set_id: str,
    question_id: str,
    current_user=Depends(get_current_user)
):
    """Delete a question"""
    try:
        success = await question_service.delete_question(question_id, current_user.id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to delete question"
            )
        
        return {"message": "Question deleted successfully"}
        
    except Exception as e:
        logger.error(f"Error deleting question: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.post("/{question_set_id}/questions/bulk", response_model=List[Question])
async def create_bulk_questions(
    question_set_id: str,
    bulk_data: BulkQuestionCreate,
    current_user=Depends(get_current_user)
):
    """Create multiple questions at once"""
    try:
        # Ensure the question_set_id matches
        bulk_data.question_set_id = question_set_id
        
        questions, success = await question_service.create_bulk_questions(bulk_data, current_user.id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create bulk questions"
            )
        
        return questions
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error creating bulk questions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.put("/{question_set_id}/questions/reorder")
async def reorder_questions(
    question_set_id: str,
    question_orders: List[Dict[str, Any]],
    current_user=Depends(get_current_user)
):
    """Reorder questions in a question set"""
    try:
        success = await question_service.reorder_questions(
            question_set_id, current_user.id, question_orders
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to reorder questions"
            )
        
        return {"message": "Questions reordered successfully"}
        
    except Exception as e:
        logger.error(f"Error reordering questions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

# AI Integration
@router.post("/{question_set_id}/generate-questions")
async def generate_questions_for_lead(
    question_set_id: str,
    lead_id: str = Query(..., description="ID of the lead to generate questions for"),
    current_user=Depends(get_current_user)
):
    """Generate AI questions for a specific lead using the question set as base"""
    try:
        # Get lead data
        from ..core.config import supabase
        lead_response = supabase.table("leads").select("*").eq("id", lead_id).eq("user_id", current_user.id).execute()
        
        if not lead_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lead not found"
            )
        
        lead_data = lead_response.data[0]
        
        # Generate questions
        questions = await question_service.generate_questions_for_lead(lead_data, question_set_id)
        
        return {
            "questions": questions,
            "lead_id": lead_id,
            "question_set_id": question_set_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating questions for lead: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )