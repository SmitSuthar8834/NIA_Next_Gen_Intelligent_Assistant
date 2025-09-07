"""
Email Service for AI Meeting System

Handles sending meeting summaries, follow-up questions, and notifications
"""

import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from datetime import datetime
from typing import Dict, List, Optional, Any
import json
import os

from ..core.config import supabase

logger = logging.getLogger(__name__)

class EmailService:
    """Service for sending emails related to AI meetings"""
    
    def __init__(self):
        self.smtp_server = os.getenv("SMTP_SERVER", os.getenv("SMTP_HOST", "smtp.gmail.com"))
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username = os.getenv("SMTP_USERNAME")
        self.smtp_password = os.getenv("SMTP_PASSWORD")
        self.from_email = os.getenv("FROM_EMAIL", self.smtp_username)
        
    async def send_meeting_summary(
        self, 
        user_email: str, 
        meeting_data: Dict[str, Any], 
        analysis: Dict[str, Any],
        transcript: str
    ) -> bool:
        """Send meeting summary email to user"""
        try:
            subject = f"Meeting Summary - {meeting_data.get('lead_name', 'Lead Meeting')}"
            
            # Generate HTML email content
            html_content = self._generate_summary_email_html(meeting_data, analysis, transcript)
            
            # Send email
            success = await self._send_email(
                to_email=user_email,
                subject=subject,
                html_content=html_content
            )
            
            if success:
                # Log email sent
                await self._log_email_sent(
                    user_email=user_email,
                    meeting_id=meeting_data.get('id'),
                    email_type='meeting_summary',
                    subject=subject
                )
                
            return success
            
        except Exception as e:
            logger.error(f"Failed to send meeting summary email: {e}")
            return False
            
    async def send_follow_up_questions(
        self,
        user_email: str,
        meeting_data: Dict[str, Any],
        questions: List[str]
    ) -> bool:
        """Send follow-up questions email to user"""
        try:
            subject = f"Follow-up Questions - {meeting_data.get('lead_name', 'Lead Meeting')}"
            
            # Generate HTML email content
            html_content = self._generate_followup_email_html(meeting_data, questions)
            
            # Send email
            success = await self._send_email(
                to_email=user_email,
                subject=subject,
                html_content=html_content
            )
            
            if success:
                # Log email sent
                await self._log_email_sent(
                    user_email=user_email,
                    meeting_id=meeting_data.get('id'),
                    email_type='follow_up_questions',
                    subject=subject
                )
                
            return success
            
        except Exception as e:
            logger.error(f"Failed to send follow-up questions email: {e}")
            return False
            
    async def _send_email(self, to_email: str, subject: str, html_content: str) -> bool:
        """Send email using SMTP"""
        try:
            if not self.smtp_username or not self.smtp_password:
                logger.warning("SMTP credentials not configured, skipping email send")
                return True  # Return True to not block the flow
                
            # Create message
            msg = MIMEMultipart('alternative')
            msg['From'] = self.from_email
            msg['To'] = to_email
            msg['Subject'] = subject
            
            # Add HTML content
            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)
            
            # Send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)
                
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False
            
    def _generate_summary_email_html(
        self, 
        meeting_data: Dict[str, Any], 
        analysis: Dict[str, Any],
        transcript: str
    ) -> str:
        """Generate HTML content for meeting summary email"""
        
        lead_name = meeting_data.get('lead_name', 'Unknown Lead')
        company = meeting_data.get('company', 'Unknown Company')
        meeting_date = meeting_data.get('scheduled_time', datetime.now().isoformat())
        
        # Parse meeting date
        try:
            meeting_dt = datetime.fromisoformat(meeting_date.replace('Z', '+00:00'))
            formatted_date = meeting_dt.strftime('%B %d, %Y at %I:%M %p')
        except:
            formatted_date = meeting_date
            
        summary = analysis.get('summary', 'No summary available')
        key_insights = analysis.get('key_insights', [])
        lead_score = analysis.get('lead_score', 0)
        next_steps = analysis.get('next_steps', [])
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Meeting Summary</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
                .content {{ background: #f8fafc; padding: 20px; border-radius: 0 0 8px 8px; }}
                .section {{ margin-bottom: 20px; }}
                .section h3 {{ color: #1e40af; margin-bottom: 10px; }}
                .score {{ background: #10b981; color: white; padding: 5px 10px; border-radius: 20px; display: inline-block; }}
                .insights {{ background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #2563eb; }}
                .transcript {{ background: white; padding: 15px; border-radius: 6px; max-height: 300px; overflow-y: auto; }}
                ul {{ padding-left: 20px; }}
                li {{ margin-bottom: 5px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🤖 AI Meeting Summary</h1>
                    <p>Meeting with {lead_name} from {company}</p>
                    <p>{formatted_date}</p>
                </div>
                
                <div class="content">
                    <div class="section">
                        <h3>📊 Lead Score</h3>
                        <span class="score">{lead_score}/100</span>
                    </div>
                    
                    <div class="section">
                        <h3>📝 Meeting Summary</h3>
                        <div class="insights">
                            <p>{summary}</p>
                        </div>
                    </div>
                    
                    <div class="section">
                        <h3>💡 Key Insights</h3>
                        <div class="insights">
                            <ul>
        """
        
        for insight in key_insights:
            html_content += f"<li>{insight}</li>"
            
        html_content += f"""
                            </ul>
                        </div>
                    </div>
                    
                    <div class="section">
                        <h3>🎯 Recommended Next Steps</h3>
                        <div class="insights">
                            <ul>
        """
        
        for step in next_steps:
            html_content += f"<li>{step}</li>"
            
        html_content += f"""
                            </ul>
                        </div>
                    </div>
                    
                    <div class="section">
                        <h3>📋 Full Transcript</h3>
                        <div class="transcript">
                            <pre>{transcript}</pre>
                        </div>
                    </div>
                    
                    <div class="section">
                        <p><em>This summary was generated by your AI meeting assistant. Please review and take appropriate follow-up actions.</em></p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        return html_content
        
    def _generate_followup_email_html(
        self, 
        meeting_data: Dict[str, Any], 
        questions: List[str]
    ) -> str:
        """Generate HTML content for follow-up questions email"""
        
        lead_name = meeting_data.get('lead_name', 'Unknown Lead')
        company = meeting_data.get('company', 'Unknown Company')
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Follow-up Questions</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #7c3aed; color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
                .content {{ background: #f8fafc; padding: 20px; border-radius: 0 0 8px 8px; }}
                .section {{ margin-bottom: 20px; }}
                .question {{ background: white; padding: 15px; border-radius: 6px; margin-bottom: 10px; border-left: 4px solid #7c3aed; }}
                .question-number {{ color: #7c3aed; font-weight: bold; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>❓ Follow-up Questions</h1>
                    <p>Additional questions for {lead_name} from {company}</p>
                </div>
                
                <div class="content">
                    <div class="section">
                        <p>Based on your recent AI meeting, here are some follow-up questions you might want to ask {lead_name}:</p>
                    </div>
                    
                    <div class="section">
        """
        
        for i, question in enumerate(questions, 1):
            html_content += f"""
                        <div class="question">
                            <span class="question-number">Q{i}:</span> {question}
                        </div>
            """
            
        html_content += """
                    </div>
                    
                    <div class="section">
                        <p><em>These questions were generated by your AI assistant to help you gather more information and move the lead forward in your sales process.</em></p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        return html_content
        
    async def _log_email_sent(
        self,
        user_email: str,
        meeting_id: str,
        email_type: str,
        subject: str
    ):
        """Log email sent to database"""
        try:
            supabase.table("email_notifications").insert({
                "meeting_id": meeting_id,
                "recipient_email": user_email,
                "email_type": email_type,
                "subject": subject,
                "sent_at": datetime.now().isoformat(),
                "delivery_status": "sent"
            }).execute()
            
        except Exception as e:
            logger.error(f"Failed to log email sent: {e}")

# Global email service instance
email_service = EmailService()