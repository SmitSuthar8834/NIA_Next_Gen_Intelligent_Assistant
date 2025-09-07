"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Brain, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Users, 
  DollarSign,
  Target,
  MessageSquare,
  BarChart3,
  RefreshCw,
  ExternalLink
} from 'lucide-react'

interface MeetingAnalysis {
  key_insights: string[]
  pain_points: string[]
  buying_signals: string[]
  next_steps: string[]
  lead_score: number
  recommended_status: string
  summary: string
  enhanced_scoring?: {
    new_lead_score: number
    score_change: number
    scoring_factors: Record<string, number>
    qualification_status: string
    confidence_level: string
    reasoning: string
    recommended_actions: string[]
    priority_level: string
  }
  detailed_insights?: {
    conversation_quality: {
      engagement_score: number
      response_quality: string
      information_depth: string
      cooperation_level: string
    }
    business_insights: {
      company_size_indication: string
      industry_challenges: string[]
      current_solutions: string[]
      technology_stack: string[]
      decision_process: string
    }
    opportunity_assessment: {
      fit_score: number
      urgency_level: string
      budget_signals: string[]
      competition_mentioned: string[]
      success_probability: string
    }
    follow_up_strategy: {
      next_meeting_type: string
      key_stakeholders_to_involve: string[]
      materials_to_prepare: string[]
      timeline_for_follow_up: string
    }
  }
  conversation_stats?: {
    total_messages: number
    human_messages: number
    ai_messages: number
    duration_estimate: number
  }
  crm_sync_status?: string
  analysis_id?: string
}

interface MeetingInsightsProps {
  meetingId: string
  analysis?: MeetingAnalysis
  onAnalysisUpdate?: (analysis: MeetingAnalysis) => void
  showGenerateButton?: boolean
  autoRefresh?: boolean
}

export default function MeetingInsights({
  meetingId,
  analysis: initialAnalysis,
  onAnalysisUpdate,
  showGenerateButton = true,
  autoRefresh = false
}: MeetingInsightsProps) {
  const [analysis, setAnalysis] = useState<MeetingAnalysis | null>(initialAnalysis || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (autoRefresh && !analysis) {
      generateAnalysis()
    }
  }, [meetingId, autoRefresh])

  const generateAnalysis = async (syncToCrm = true) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/real-time-analysis/generate-analysis/${meetingId}?sync_to_crm=${syncToCrm}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        }
      )

      if (!response.ok) {
        throw new Error('Failed to generate analysis')
      }

      const analysisData = await response.json()
      setAnalysis(analysisData)
      onAnalysisUpdate?.(analysisData)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate analysis')
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBackground = (score: number) => {
    if (score >= 80) return 'bg-green-100'
    if (score >= 60) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const getQualificationColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'qualified': return 'text-green-600 bg-green-100'
      case 'unqualified': return 'text-red-600 bg-red-100'
      case 'needs_follow_up': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  if (!analysis && !loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">AI Meeting Analysis</h3>
          <p className="text-gray-500 mb-4">
            Generate AI-powered insights from your meeting conversation
          </p>
          {showGenerateButton && (
            <Button onClick={() => generateAnalysis()} disabled={loading}>
              <Brain className="w-4 h-4 mr-2" />
              Generate Analysis
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Analyzing conversation...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <Button variant="outline" onClick={() => generateAnalysis()}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!analysis) return null

  return (
    <div className="space-y-6">
      {/* Header with key metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className={`text-2xl font-bold ${getScoreColor(analysis.enhanced_scoring?.new_lead_score || analysis.lead_score)}`}>
              {analysis.enhanced_scoring?.new_lead_score || analysis.lead_score}
            </div>
            <div className="text-sm text-gray-500">Lead Score</div>
            {analysis.enhanced_scoring?.score_change !== undefined && (
              <div className={`text-xs ${analysis.enhanced_scoring.score_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {analysis.enhanced_scoring.score_change >= 0 ? '+' : ''}{analysis.enhanced_scoring.score_change}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Badge className={getQualificationColor(analysis.enhanced_scoring?.qualification_status || analysis.recommended_status)}>
              {analysis.enhanced_scoring?.qualification_status || analysis.recommended_status}
            </Badge>
            <div className="text-sm text-gray-500 mt-1">Status</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center">
              <div className={`w-3 h-3 rounded-full ${getPriorityColor(analysis.enhanced_scoring?.priority_level || 'medium')} mr-2`} />
              <span className="text-sm font-medium capitalize">
                {analysis.enhanced_scoring?.priority_level || 'Medium'}
              </span>
            </div>
            <div className="text-sm text-gray-500 mt-1">Priority</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-lg font-semibold">
              {analysis.detailed_insights?.opportunity_assessment?.fit_score || 'N/A'}
            </div>
            <div className="text-sm text-gray-500">Fit Score</div>
          </CardContent>
        </Card>
      </div>

      {/* CRM Sync Status */}
      {analysis.crm_sync_status && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                <span className="text-sm font-medium">CRM Sync Status</span>
              </div>
              <Badge variant={analysis.crm_sync_status === 'success' ? 'default' : 'destructive'}>
                {analysis.crm_sync_status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Analysis Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="scoring">Scoring</TabsTrigger>
          <TabsTrigger value="opportunity">Opportunity</TabsTrigger>
          <TabsTrigger value="next-steps">Next Steps</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Meeting Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">{analysis.summary}</p>
              
              {analysis.conversation_stats && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="font-medium">{analysis.conversation_stats.total_messages}</div>
                    <div className="text-gray-500">Total Messages</div>
                  </div>
                  <div>
                    <div className="font-medium">{analysis.conversation_stats.human_messages}</div>
                    <div className="text-gray-500">Your Messages</div>
                  </div>
                  <div>
                    <div className="font-medium">{analysis.conversation_stats.ai_messages}</div>
                    <div className="text-gray-500">AI Messages</div>
                  </div>
                  <div>
                    <div className="font-medium">{Math.round(analysis.conversation_stats.duration_estimate / 60)}m</div>
                    <div className="text-gray-500">Est. Duration</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Buying Signals
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analysis.buying_signals.length > 0 ? (
                  <ul className="space-y-2">
                    {analysis.buying_signals.map((signal, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{signal}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 text-sm">No buying signals detected</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  Pain Points
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analysis.pain_points.length > 0 ? (
                  <ul className="space-y-2">
                    {analysis.pain_points.map((pain, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{pain}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 text-sm">No pain points identified</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Key Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analysis.key_insights.length > 0 ? (
                <ul className="space-y-3">
                  {analysis.key_insights.map((insight, index) => (
                    <li key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm font-medium flex-shrink-0">
                        {index + 1}
                      </div>
                      <span className="text-sm">{insight}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">No key insights available</p>
              )}
            </CardContent>
          </Card>

          {analysis.detailed_insights?.business_insights && (
            <Card>
              <CardHeader>
                <CardTitle>Business Context</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-sm text-gray-700 mb-2">Company Size</h4>
                    <Badge variant="outline" className="capitalize">
                      {analysis.detailed_insights.business_insights.company_size_indication}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-gray-700 mb-2">Decision Process</h4>
                    <Badge variant="outline" className="capitalize">
                      {analysis.detailed_insights.business_insights.decision_process}
                    </Badge>
                  </div>
                </div>

                {analysis.detailed_insights.business_insights.industry_challenges.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-gray-700 mb-2">Industry Challenges</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.detailed_insights.business_insights.industry_challenges.map((challenge, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {challenge}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.detailed_insights.business_insights.current_solutions.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-gray-700 mb-2">Current Solutions</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.detailed_insights.business_insights.current_solutions.map((solution, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {solution}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="scoring" className="space-y-4">
          {analysis.enhanced_scoring && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Enhanced Scoring Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Lead Score</span>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold">{analysis.enhanced_scoring.new_lead_score}</span>
                        <Badge variant={analysis.enhanced_scoring.score_change >= 0 ? 'default' : 'destructive'}>
                          {analysis.enhanced_scoring.score_change >= 0 ? '+' : ''}{analysis.enhanced_scoring.score_change}
                        </Badge>
                      </div>
                    </div>
                    
                    <Progress value={analysis.enhanced_scoring.new_lead_score} className="h-2" />
                    
                    <div className="text-sm text-gray-600">
                      <strong>Confidence:</strong> {analysis.enhanced_scoring.confidence_level}
                    </div>
                    
                    <div className="text-sm">
                      <strong>Reasoning:</strong> {analysis.enhanced_scoring.reasoning}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Scoring Factors</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(analysis.enhanced_scoring.scoring_factors).map(([factor, score]) => (
                      <div key={factor} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{factor.replace('_', ' ')}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${Math.abs(score) * 2}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-8 text-right">
                            {score > 0 ? '+' : ''}{score}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="opportunity" className="space-y-4">
          {analysis.detailed_insights?.opportunity_assessment && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Opportunity Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Fit Score</span>
                    <span className="font-bold">{analysis.detailed_insights.opportunity_assessment.fit_score}/10</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Urgency</span>
                    <Badge variant="outline" className="capitalize">
                      {analysis.detailed_insights.opportunity_assessment.urgency_level}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Success Probability</span>
                    <Badge variant="outline" className="capitalize">
                      {analysis.detailed_insights.opportunity_assessment.success_probability}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Budget & Competition
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {analysis.detailed_insights.opportunity_assessment.budget_signals.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Budget Signals</h4>
                      <div className="space-y-1">
                        {analysis.detailed_insights.opportunity_assessment.budget_signals.map((signal, index) => (
                          <div key={index} className="text-sm text-gray-600">• {signal}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysis.detailed_insights.opportunity_assessment.competition_mentioned.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Competition Mentioned</h4>
                      <div className="flex flex-wrap gap-1">
                        {analysis.detailed_insights.opportunity_assessment.competition_mentioned.map((competitor, index) => (
                          <Badge key={index} variant="destructive" className="text-xs">
                            {competitor}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="next-steps" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Recommended Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analysis.next_steps.length > 0 ? (
                  <ul className="space-y-2">
                    {analysis.next_steps.map((step, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-medium flex-shrink-0 mt-0.5">
                          {index + 1}
                        </div>
                        <span className="text-sm">{step}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 text-sm">No specific next steps identified</p>
                )}

                {analysis.enhanced_scoring?.recommended_actions && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="text-sm font-medium mb-2">AI Recommendations</h4>
                    <ul className="space-y-1">
                      {analysis.enhanced_scoring.recommended_actions.map((action, index) => (
                        <li key={index} className="text-sm text-gray-600">• {action}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {analysis.detailed_insights?.follow_up_strategy && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Follow-up Strategy
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-1">Next Meeting Type</h4>
                    <Badge variant="outline" className="capitalize">
                      {analysis.detailed_insights.follow_up_strategy.next_meeting_type.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-1">Timeline</h4>
                    <Badge variant="outline" className="capitalize">
                      {analysis.detailed_insights.follow_up_strategy.timeline_for_follow_up}
                    </Badge>
                  </div>

                  {analysis.detailed_insights.follow_up_strategy.key_stakeholders_to_involve.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Key Stakeholders</h4>
                      <div className="space-y-1">
                        {analysis.detailed_insights.follow_up_strategy.key_stakeholders_to_involve.map((stakeholder, index) => (
                          <div key={index} className="text-sm text-gray-600">• {stakeholder}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysis.detailed_insights.follow_up_strategy.materials_to_prepare.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Materials to Prepare</h4>
                      <div className="space-y-1">
                        {analysis.detailed_insights.follow_up_strategy.materials_to_prepare.map((material, index) => (
                          <div key={index} className="text-sm text-gray-600">• {material}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Refresh Button */}
      {showGenerateButton && (
        <div className="flex justify-center">
          <Button 
            variant="outline" 
            onClick={() => generateAnalysis()}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Analysis
          </Button>
        </div>
      )}
    </div>
  )
}