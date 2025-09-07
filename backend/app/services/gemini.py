"""
Gemini AI Service for Meeting Analysis and Question Generation

Handles AI-powered conversation analysis, question generation, and insights extraction
"""

import logging
import json
import os
from typing import Dict, List, Optional, Any
import google.generativeai as genai
from datetime import datetime

logger = logging.getLogger(__name__)

class GeminiService:
    """Service for AI-powered meeting analysis using Google Gemini"""
    
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if self.api_key:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel('gemini-pro')
        else:
            logger.warning("GEMINI_API_KEY not configured, AI features will be limited")
            self.model = None
            
    async def generate_questions_for_lead(
        self, 
        lead_data: Dict[str, Any], 
        question_set_id: Optional[str] = None
    ) -> List[str]:
        """Generate personalized questions for a lead"""
        try:
            if not self.model:
                return self._get_default_questions()
                
            company = lead_data.get('company', 'the company')
            industry = lead_data.get('industry', 'their industry')
            lead_name = lead_data.get('name', 'the prospect')
            
            prompt = f"""
            Generate 7 discovery questions for a sales meeting with {lead_name} from {company} in {industry}.
            
            Lead Information:
            - Name: {lead_name}
            - Company: {company}
            - Industry: {industry}
            - Status: {lead_data.get('status', 'new')}
            - Email: {lead_data.get('email', 'not provided')}
            
            Generate questions that are:
            1. Open-ended and encourage detailed responses
            2. Focused on understanding their business challenges
            3. Designed to qualify their needs and budget
            4. Professional and conversational
            5. Specific to their industry when possible
            
            Return exactly 7 questions as a JSON array of strings.
            """
            
            response = self.model.generate_content(prompt)
            
            # Parse the response
            questions_text = response.text.strip()
            
            # Try to extract JSON from the response
            try:
                # Look for JSON array in the response
                start_idx = questions_text.find('[')
                end_idx = questions_text.rfind(']') + 1
                
                if start_idx != -1 and end_idx != -1:
                    json_str = questions_text[start_idx:end_idx]
                    questions = json.loads(json_str)
                    
                    if isinstance(questions, list) and len(questions) > 0:
                        return questions[:7]  # Ensure max 7 questions
                        
            except json.JSONDecodeError:
                pass
                
            # Fallback: split by lines and clean up
            lines = questions_text.split('\n')
            questions = []
            
            for line in lines:
                line = line.strip()
                if line and not line.startswith('#') and '?' in line:
                    # Clean up the line
                    line = line.replace('**', '').replace('*', '').strip()
                    if line.startswith(('1.', '2.', '3.', '4.', '5.', '6.', '7.')):
                        line = line[2:].strip()
                    questions.append(line)
                    
            return questions[:7] if questions else self._get_default_questions()
            
        except Exception as e:
            logger.error(f"Failed to generate questions for lead: {e}")
            return self._get_default_questions()
            
    async def generate_next_question(
        self,
        conversation_history: List[Dict[str, Any]],
        remaining_questions: List[str],
        lead_data: Dict[str, Any]
    ) -> str:
        """Generate the next contextual question based on conversation flow"""
        try:
            if not self.model:
                if remaining_questions:
                    return remaining_questions[0]
                return "Can you tell me more about your current challenges?"
                
            # Format conversation history
            conversation_text = ""
            for msg in conversation_history[-6:]:  # Last 6 messages for context
                speaker = "AI" if msg['speaker'] == 'ai' else "Human"
                conversation_text += f"{speaker}: {msg['message']}\n"
                
            prompt = f"""
            Based on this conversation with {lead_data.get('name', 'the prospect')} from {lead_data.get('company', 'their company')}, generate the next most appropriate question.
            
            Conversation so far:
            {conversation_text}
            
            Remaining planned questions:
            {chr(10).join(f"- {q}" for q in remaining_questions[:3])}
            
            Generate a natural follow-up question that:
            1. Builds on what they just said
            2. Digs deeper into their needs or challenges
            3. Helps qualify their budget and timeline
            4. Feels conversational and not scripted
            5. Is open-ended to encourage detailed responses
            
            Return only the question, no additional text.
            """
            
            response = self.model.generate_content(prompt)
            question = response.text.strip()
            
            # Clean up the response
            if question.startswith('"') and question.endswith('"'):
                question = question[1:-1]
                
            return question if question else remaining_questions[0] if remaining_questions else "What else would you like to share about your business?"
            
        except Exception as e:
            logger.error(f"Failed to generate next question: {e}")
            return remaining_questions[0] if remaining_questions else "Can you tell me more about that?"
            
    async def analyze_conversation(
        self,
        conversation_history: List[Dict[str, Any]],
        lead_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Analyze the complete conversation and generate insights"""
        try:
            if not self.model:
                return self._get_default_analysis(conversation_history, lead_data)
                
            # Format conversation for analysis
            conversation_text = ""
            for msg in conversation_history:
                speaker = "AI Assistant" if msg['speaker'] == 'ai' else f"{lead_data.get('name', 'Prospect')}"
                conversation_text += f"{speaker}: {msg['message']}\n"
                
            prompt = f"""
            Analyze this sales discovery conversation with {lead_data.get('name', 'the prospect')} from {lead_data.get('company', 'their company')}.
            
            CONVERSATION:
            {conversation_text}
            
            LEAD INFORMATION:
            - Company: {lead_data.get('company', 'Unknown')}
            - Industry: {lead_data.get('industry', 'Unknown')}
            - Current Status: {lead_data.get('status', 'new')}
            
            Provide a comprehensive analysis in JSON format with these fields:
            
            {{
                "summary": "2-3 sentence summary of the conversation",
                "lead_score": 85,
                "key_insights": [
                    "Insight 1 about their business needs",
                    "Insight 2 about their challenges",
                    "Insight 3 about their budget/timeline"
                ],
                "pain_points": [
                    "Main pain point 1",
                    "Pain point 2"
                ],
                "opportunities": [
                    "Sales opportunity 1",
                    "Opportunity 2"
                ],
                "budget_indicators": "What they revealed about budget",
                "timeline_indicators": "What they revealed about timeline",
                "decision_makers": "Who makes decisions",
                "next_steps": [
                    "Recommended action 1",
                    "Recommended action 2"
                ],
                "follow_up_questions": [
                    "Question to ask in follow-up",
                    "Another follow-up question"
                ],
                "qualification_status": "qualified|partially_qualified|not_qualified",
                "notes": "Additional notes for the sales team"
            }}
            
            Score the lead from 0-100 based on:
            - Budget fit (25 points)
            - Timeline urgency (25 points) 
            - Authority/decision making (25 points)
            - Need/pain level (25 points)
            
            Return only valid JSON.
            """
            
            response = self.model.generate_content(prompt)
            analysis_text = response.text.strip()
            
            # Try to extract JSON from response
            try:
                # Look for JSON object in the response
                start_idx = analysis_text.find('{')
                end_idx = analysis_text.rfind('}') + 1
                
                if start_idx != -1 and end_idx != -1:
                    json_str = analysis_text[start_idx:end_idx]
                    analysis = json.loads(json_str)
                    
                    # Validate required fields
                    required_fields = ['summary', 'lead_score', 'key_insights', 'next_steps']
                    if all(field in analysis for field in required_fields):
                        return analysis
                        
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse AI analysis JSON: {e}")
                
            # Fallback to default analysis
            return self._get_default_analysis(conversation_history, lead_data)
            
        except Exception as e:
            logger.error(f"Failed to analyze conversation: {e}")
            return self._get_default_analysis(conversation_history, lead_data)
            
    async def generate_meeting_transcript(
        self,
        conversation_history: List[Dict[str, Any]],
        lead_data: Dict[str, Any]
    ) -> str:
        """Generate a formatted transcript of the meeting"""
        try:
            transcript = f"AI Discovery Meeting Transcript\n"
            transcript += f"Date: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}\n"
            transcript += f"Participant: {lead_data.get('name', 'Unknown')} from {lead_data.get('company', 'Unknown Company')}\n"
            transcript += f"AI Assistant: Discovery Bot\n\n"
            transcript += "=" * 50 + "\n\n"
            
            for msg in conversation_history:
                timestamp = msg.get('timestamp', datetime.now().isoformat())
                try:
                    dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                    time_str = dt.strftime('%I:%M %p')
                except:
                    time_str = "Unknown"
                    
                speaker = "AI Assistant" if msg['speaker'] == 'ai' else lead_data.get('name', 'Participant')
                transcript += f"[{time_str}] {speaker}: {msg['message']}\n\n"
                
            transcript += "=" * 50 + "\n"
            transcript += "End of Transcript"
            
            return transcript
            
        except Exception as e:
            logger.error(f"Failed to generate transcript: {e}")
            return "Transcript generation failed"
            
    def _get_default_questions(self) -> List[str]:
        """Get default discovery questions when AI is not available"""
        return [
            "Can you tell me about your company and what you do?",
            "What are the main challenges you're facing in your business right now?",
            "How are you currently handling [relevant process/area]?",
            "What would an ideal solution look like for you?",
            "What's your timeline for making a decision on this?",
            "Who else would be involved in the decision-making process?",
            "What budget range are you working with for this project?"
        ]
        
    def _get_default_analysis(
        self, 
        conversation_history: List[Dict[str, Any]], 
        lead_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Get default analysis when AI is not available"""
        
        # Simple analysis based on conversation length and content
        message_count = len([msg for msg in conversation_history if msg['speaker'] == 'human'])
        
        # Basic scoring
        base_score = min(message_count * 10, 70)  # Up to 70 points for engagement
        
        return {
            "summary": f"Had a discovery conversation with {lead_data.get('name', 'the prospect')} from {lead_data.get('company', 'their company')}. They provided {message_count} responses during our discussion.",
            "lead_score": base_score,
            "key_insights": [
                "Prospect engaged in conversation",
                f"Provided {message_count} detailed responses",
                "Showed interest in discussing their business"
            ],
            "pain_points": [
                "Specific pain points to be identified in follow-up"
            ],
            "opportunities": [
                "Potential sales opportunity identified",
                "Needs further qualification"
            ],
            "budget_indicators": "Budget discussion needed",
            "timeline_indicators": "Timeline to be determined",
            "decision_makers": "Decision makers to be identified",
            "next_steps": [
                "Schedule follow-up call",
                "Send additional information",
                "Qualify budget and timeline"
            ],
            "follow_up_questions": [
                "What's your budget range for this type of solution?",
                "When would you like to have this implemented?",
                "Who else would be involved in making this decision?"
            ],
            "qualification_status": "partially_qualified",
            "notes": f"Initial discovery completed with {message_count} responses. Needs follow-up for full qualification."
        }

# Global Gemini service instance
gemini_service = GeminiService()