"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { 
  Plus, 
  Edit, 
  Trash2, 
  GripVertical, 
  Eye, 
  Save, 
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  HelpCircle,
  Star,
  Copy
} from "lucide-react"
import { useUser } from "@/hooks/useUser"

interface Question {
  id: string
  question_text: string
  question_type: 'open_ended' | 'multiple_choice' | 'rating'
  order_index: number
  is_active: boolean
  created_at: string
}

interface QuestionSet {
  id: string
  name: string
  description: string
  is_default: boolean
  question_count: number
  questions: Question[]
  created_at: string
}

interface QuestionSetManagerProps {
  onQuestionSetSelected?: (questionSet: QuestionSet) => void
}

export default function QuestionSetManager({ onQuestionSetSelected }: QuestionSetManagerProps) {
  const { user, access_token } = useUser()
  
  // Data state
  const [questionSets, setQuestionSets] = useState<QuestionSet[]>([])
  const [selectedQuestionSet, setSelectedQuestionSet] = useState<QuestionSet | null>(null)
  
  // Form state
  const [editingQuestionSet, setEditingQuestionSet] = useState<Partial<QuestionSet> | null>(null)
  const [editingQuestion, setEditingQuestion] = useState<Partial<Question> | null>(null)
  const [newQuestionText, setNewQuestionText] = useState("")
  const [newQuestionType, setNewQuestionType] = useState<Question['question_type']>('open_ended')
  
  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showQuestionDialog, setShowQuestionDialog] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [draggedQuestion, setDraggedQuestion] = useState<Question | null>(null)

  useEffect(() => {
    fetchQuestionSets()
  }, [])

  const fetchQuestionSets = async () => {
    if (!access_token) return

    try {
      setLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/question-sets/`, {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setQuestionSets(data)
        
        // Auto-select first question set
        if (data.length > 0 && !selectedQuestionSet) {
          setSelectedQuestionSet(data[0])
        }
      } else {
        setError('Failed to fetch question sets')
      }
    } catch (err) {
      setError('Failed to fetch question sets')
    } finally {
      setLoading(false)
    }
  }

  const createQuestionSet = async () => {
    if (!editingQuestionSet?.name || !access_token) return

    try {
      setLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/question-sets/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${access_token}`
        },
        body: JSON.stringify({
          name: editingQuestionSet.name,
          description: editingQuestionSet.description || "",
          is_default: editingQuestionSet.is_default || false
        })
      })

      if (response.ok) {
        const newQuestionSet = await response.json()
        setQuestionSets(prev => [newQuestionSet, ...prev])
        setSelectedQuestionSet(newQuestionSet)
        setEditingQuestionSet(null)
        setShowCreateDialog(false)
        setSuccess('Question set created successfully!')
      } else {
        const errorData = await response.json()
        setError(errorData.detail || 'Failed to create question set')
      }
    } catch (err) {
      setError('Failed to create question set')
    } finally {
      setLoading(false)
    }
  }

  const updateQuestionSet = async (questionSetId: string, updates: Partial<QuestionSet>) => {
    if (!access_token) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/question-sets/${questionSetId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${access_token}`
        },
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        const updatedQuestionSet = await response.json()
        setQuestionSets(prev => 
          prev.map(qs => qs.id === questionSetId ? updatedQuestionSet : qs)
        )
        if (selectedQuestionSet?.id === questionSetId) {
          setSelectedQuestionSet(updatedQuestionSet)
        }
        setSuccess('Question set updated successfully!')
      } else {
        setError('Failed to update question set')
      }
    } catch (err) {
      setError('Failed to update question set')
    }
  }

  const deleteQuestionSet = async (questionSetId: string) => {
    if (!access_token) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/question-sets/${questionSetId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      })

      if (response.ok) {
        setQuestionSets(prev => prev.filter(qs => qs.id !== questionSetId))
        if (selectedQuestionSet?.id === questionSetId) {
          setSelectedQuestionSet(questionSets[0] || null)
        }
        setSuccess('Question set deleted successfully!')
      } else {
        setError('Failed to delete question set')
      }
    } catch (err) {
      setError('Failed to delete question set')
    }
  }

  const addQuestion = async () => {
    if (!selectedQuestionSet || !newQuestionText.trim() || !access_token) return

    try {
      setLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/question-sets/${selectedQuestionSet.id}/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${access_token}`
        },
        body: JSON.stringify({
          question_text: newQuestionText.trim(),
          question_type: newQuestionType,
          order_index: selectedQuestionSet.questions.length
        })
      })

      if (response.ok) {
        const newQuestion = await response.json()
        const updatedQuestionSet = {
          ...selectedQuestionSet,
          questions: [...selectedQuestionSet.questions, newQuestion],
          question_count: selectedQuestionSet.question_count + 1
        }
        
        setSelectedQuestionSet(updatedQuestionSet)
        setQuestionSets(prev => 
          prev.map(qs => qs.id === selectedQuestionSet.id ? updatedQuestionSet : qs)
        )
        
        setNewQuestionText("")
        setNewQuestionType('open_ended')
        setShowQuestionDialog(false)
        setSuccess('Question added successfully!')
      } else {
        setError('Failed to add question')
      }
    } catch (err) {
      setError('Failed to add question')
    } finally {
      setLoading(false)
    }
  }

  const updateQuestion = async (questionId: string, updates: Partial<Question>) => {
    if (!selectedQuestionSet || !access_token) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/questions/${questionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${access_token}`
        },
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        const updatedQuestion = await response.json()
        const updatedQuestionSet = {
          ...selectedQuestionSet,
          questions: selectedQuestionSet.questions.map(q => 
            q.id === questionId ? updatedQuestion : q
          )
        }
        
        setSelectedQuestionSet(updatedQuestionSet)
        setQuestionSets(prev => 
          prev.map(qs => qs.id === selectedQuestionSet.id ? updatedQuestionSet : qs)
        )
        setSuccess('Question updated successfully!')
      } else {
        setError('Failed to update question')
      }
    } catch (err) {
      setError('Failed to update question')
    }
  }

  const deleteQuestion = async (questionId: string) => {
    if (!selectedQuestionSet || !access_token) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/questions/${questionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      })

      if (response.ok) {
        const updatedQuestionSet = {
          ...selectedQuestionSet,
          questions: selectedQuestionSet.questions.filter(q => q.id !== questionId),
          question_count: selectedQuestionSet.question_count - 1
        }
        
        setSelectedQuestionSet(updatedQuestionSet)
        setQuestionSets(prev => 
          prev.map(qs => qs.id === selectedQuestionSet.id ? updatedQuestionSet : qs)
        )
        setSuccess('Question deleted successfully!')
      } else {
        setError('Failed to delete question')
      }
    } catch (err) {
      setError('Failed to delete question')
    }
  }

  const reorderQuestions = async (questions: Question[]) => {
    if (!selectedQuestionSet || !access_token) return

    try {
      const reorderedQuestions = questions.map((q, index) => ({
        ...q,
        order_index: index
      }))

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/question-sets/${selectedQuestionSet.id}/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${access_token}`
        },
        body: JSON.stringify({
          question_orders: reorderedQuestions.map(q => ({
            question_id: q.id,
            order_index: q.order_index
          }))
        })
      })

      if (response.ok) {
        const updatedQuestionSet = {
          ...selectedQuestionSet,
          questions: reorderedQuestions
        }
        
        setSelectedQuestionSet(updatedQuestionSet)
        setQuestionSets(prev => 
          prev.map(qs => qs.id === selectedQuestionSet.id ? updatedQuestionSet : qs)
        )
      }
    } catch (err) {
      console.error('Failed to reorder questions:', err)
    }
  }

  const handleDragStart = (question: Question) => {
    setDraggedQuestion(question)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, targetQuestion: Question) => {
    e.preventDefault()
    
    if (!draggedQuestion || !selectedQuestionSet) return

    const questions = [...selectedQuestionSet.questions]
    const draggedIndex = questions.findIndex(q => q.id === draggedQuestion.id)
    const targetIndex = questions.findIndex(q => q.id === targetQuestion.id)

    if (draggedIndex !== -1 && targetIndex !== -1) {
      questions.splice(draggedIndex, 1)
      questions.splice(targetIndex, 0, draggedQuestion)
      
      reorderQuestions(questions)
    }
    
    setDraggedQuestion(null)
  }

  const duplicateQuestionSet = async (questionSet: QuestionSet) => {
    if (!access_token) return

    try {
      setLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/question-sets/${questionSet.id}/duplicate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      })

      if (response.ok) {
        const duplicatedQuestionSet = await response.json()
        setQuestionSets(prev => [duplicatedQuestionSet, ...prev])
        setSuccess('Question set duplicated successfully!')
      } else {
        setError('Failed to duplicate question set')
      }
    } catch (err) {
      setError('Failed to duplicate question set')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5" />
                Question Set Manager
              </CardTitle>
              <CardDescription>
                Create and manage question sets for AI meetings
              </CardDescription>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  New Question Set
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Question Set</DialogTitle>
                  <DialogDescription>
                    Create a new set of questions for AI meetings
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={editingQuestionSet?.name || ""}
                      onChange={(e) => setEditingQuestionSet(prev => ({
                        ...prev,
                        name: e.target.value
                      }))}
                      placeholder="e.g., Discovery Questions"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={editingQuestionSet?.description || ""}
                      onChange={(e) => setEditingQuestionSet(prev => ({
                        ...prev,
                        description: e.target.value
                      }))}
                      placeholder="Describe the purpose of this question set"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_default"
                      checked={editingQuestionSet?.is_default || false}
                      onChange={(e) => setEditingQuestionSet(prev => ({
                        ...prev,
                        is_default: e.target.checked
                      }))}
                    />
                    <Label htmlFor="is_default">Set as default</Label>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button onClick={createQuestionSet} disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Create
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Question Sets List */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Question Sets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {questionSets.map((questionSet) => (
                  <div
                    key={questionSet.id}
                    className={`p-3 border rounded-md cursor-pointer transition-colors ${
                      selectedQuestionSet?.id === questionSet.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedQuestionSet(questionSet)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{questionSet.name}</span>
                          {questionSet.is_default && (
                            <Star className="w-4 h-4 text-yellow-500" />
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {questionSet.question_count} questions
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            duplicateQuestionSet(questionSet)
                          }}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteQuestionSet(questionSet.id)
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Question Set Details */}
        <div className="lg:col-span-2 space-y-4">
          {selectedQuestionSet ? (
            <>
              {/* Question Set Info */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {selectedQuestionSet.name}
                        {selectedQuestionSet.is_default && (
                          <Badge variant="outline">Default</Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {selectedQuestionSet.description || "No description"}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPreview(!showPreview)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Preview
                      </Button>
                      {onQuestionSetSelected && (
                        <Button
                          size="sm"
                          onClick={() => onQuestionSetSelected(selectedQuestionSet)}
                        >
                          Select
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Questions List */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      Questions ({selectedQuestionSet.questions.length})
                    </CardTitle>
                    <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="w-4 h-4 mr-1" />
                          Add Question
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Question</DialogTitle>
                          <DialogDescription>
                            Add a new question to this question set
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="question-text">Question Text *</Label>
                            <Textarea
                              id="question-text"
                              value={newQuestionText}
                              onChange={(e) => setNewQuestionText(e.target.value)}
                              placeholder="Enter your question here..."
                            />
                          </div>
                          <div>
                            <Label htmlFor="question-type">Question Type</Label>
                            <Select value={newQuestionType} onValueChange={(value: Question['question_type']) => setNewQuestionType(value)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="open_ended">Open Ended</SelectItem>
                                <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                                <SelectItem value="rating">Rating</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex gap-2 pt-4">
                            <Button onClick={addQuestion} disabled={loading || !newQuestionText.trim()}>
                              {loading ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Adding...
                                </>
                              ) : (
                                <>
                                  <Plus className="w-4 h-4 mr-2" />
                                  Add Question
                                </>
                              )}
                            </Button>
                            <Button variant="outline" onClick={() => setShowQuestionDialog(false)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedQuestionSet.questions
                      .sort((a, b) => a.order_index - b.order_index)
                      .map((question, index) => (
                        <div
                          key={question.id}
                          className="flex items-start gap-3 p-3 border rounded-md"
                          draggable
                          onDragStart={() => handleDragStart(question)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, question)}
                        >
                          <div className="flex items-center gap-2">
                            <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                            <span className="text-sm font-medium text-muted-foreground">
                              {index + 1}
                            </span>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            {editingQuestion?.id === question.id ? (
                              <div className="space-y-2">
                                <Textarea
                                  value={editingQuestion.question_text || ""}
                                  onChange={(e) => setEditingQuestion(prev => ({
                                    ...prev,
                                    question_text: e.target.value
                                  }))}
                                />
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      updateQuestion(question.id, editingQuestion)
                                      setEditingQuestion(null)
                                    }}
                                  >
                                    <Save className="w-3 h-3 mr-1" />
                                    Save
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEditingQuestion(null)}
                                  >
                                    <X className="w-3 h-3 mr-1" />
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="text-sm">{question.question_text}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" size="sm">
                                    {question.question_type.replace('_', ' ')}
                                  </Badge>
                                  {!question.is_active && (
                                    <Badge variant="secondary" size="sm">
                                      Inactive
                                    </Badge>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                          
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingQuestion(question)}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteQuestion(question.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              {/* Preview */}
              {showPreview && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Question Set Preview</CardTitle>
                    <CardDescription>
                      How this question set will appear in AI meetings
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {selectedQuestionSet.questions
                        .filter(q => q.is_active)
                        .sort((a, b) => a.order_index - b.order_index)
                        .map((question, index) => (
                          <div key={question.id} className="p-4 border rounded-md bg-muted/30">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                <span className="text-sm font-medium text-blue-600">
                                  {index + 1}
                                </span>
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium">{question.question_text}</p>
                                <Badge variant="outline" size="sm" className="mt-1">
                                  {question.question_type.replace('_', ' ')}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <HelpCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Question Set Selected</h3>
                <p className="text-muted-foreground">
                  Select a question set from the list to view and edit its questions
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}