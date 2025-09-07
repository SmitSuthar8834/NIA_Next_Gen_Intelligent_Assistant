'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Upload, Save, User, CheckCircle, AlertCircle, Camera, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useProfile } from '@/hooks/useUser'
import RequireAuth from '@/components/RequireAuth'
import Link from 'next/link'

interface UserProfile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  phone?: string
  company?: string
  job_title?: string
  bio?: string
  website?: string
  created_at: string
  updated_at?: string
}

export default function ProfilePage() {
  const { profile, loading: userLoading, updateProfile, refreshProfile, error: storeError } = useProfile()
  const [localProfile, setLocalProfile] = useState<UserProfile | null>(profile)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (profile) {
      setLocalProfile(profile)
      setHasChanges(false)
    }
  }, [profile])

  useEffect(() => {
    if (localProfile && profile) {
      const changed = JSON.stringify(localProfile) !== JSON.stringify(profile)
      setHasChanges(changed)
    }
  }, [localProfile, profile])

  useEffect(() => {
    if (storeError) {
      setError(storeError)
    }
  }, [storeError])

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      setError('')
      setMessage('')

      if (!event.target.files || event.target.files.length === 0) {
        return
      }

      const file = event.target.files[0]
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB')
        return
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file')
        return
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${profile?.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      // Delete old avatar if exists
      if (profile?.avatar_url) {
        const oldPath = profile.avatar_url.split('/').pop()
        if (oldPath && oldPath.includes(profile.id)) {
          await supabase.storage
            .from('avatars')
            .remove([`avatars/${oldPath}`])
        }
      }

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // Update profile with new avatar URL
      if (localProfile) {
        const updatedProfile = { ...localProfile, avatar_url: publicUrl }
        setLocalProfile(updatedProfile)
        
        // Save to database immediately
        await updateProfile({ avatar_url: publicUrl })
        setMessage('Avatar updated successfully!')
      }
    } catch (error: any) {
      console.error('Error uploading avatar:', error)
      setError('Error uploading avatar: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const saveProfile = async () => {
    if (!localProfile) return

    setSaving(true)
    setError('')
    setMessage('')

    try {
      await updateProfile({
        full_name: localProfile.full_name,
        phone: localProfile.phone,
        company: localProfile.company,
        job_title: localProfile.job_title,
        bio: localProfile.bio,
        website: localProfile.website,
      })

      setMessage('Profile updated successfully!')
      setHasChanges(false)
    } catch (error: any) {
      console.error('Error updating profile:', error)
      setError('Error updating profile')
    } finally {
      setSaving(false)
    }
  }

  const updateField = (field: string, value: string) => {
    if (!localProfile) return
    setLocalProfile({ ...localProfile, [field]: value })
  }

  const resetChanges = () => {
    if (profile) {
      setLocalProfile(profile)
      setHasChanges(false)
      setMessage('')
      setError('')
    }
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  if (userLoading) {
    return (
      <RequireAuth>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </RequireAuth>
    )
  }

  if (!localProfile && !userLoading) {
    return (
      <RequireAuth>
        <div className="text-center py-8">
          <h2 className="text-2xl font-bold">Profile not found</h2>
          <p className="text-muted-foreground mt-2">
            {storeError || 'Unable to load your profile'}
          </p>
          <Button onClick={refreshProfile} className="mt-4">
            Retry
          </Button>
        </div>
      </RequireAuth>
    )
  }

  return (
    <RequireAuth>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-4">
              <Button asChild variant="ghost" size="sm">
                <Link href="/">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
            </div>
            <h1 className="text-3xl font-bold mt-2">Profile Settings</h1>
            <p className="text-muted-foreground mt-2">Manage your account settings and preferences</p>
          </div>
          {hasChanges && (
            <div className="flex space-x-2">
              <Button onClick={resetChanges} variant="outline" size="sm">
                Reset Changes
              </Button>
              <Button onClick={saveProfile} disabled={saving} size="sm">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          )}
        </div>

        {message && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Avatar and Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Picture</CardTitle>
              <CardDescription>Upload and manage your profile picture</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={localProfile.avatar_url} />
                    <AvatarFallback className="text-lg">
                      {localProfile.full_name ? getInitials(localProfile.full_name) : <User />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute bottom-0 right-0">
                    <label htmlFor="avatar-upload" className="cursor-pointer">
                      <div className="bg-primary text-primary-foreground rounded-full p-2 hover:bg-primary/90">
                        {uploading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Camera className="h-4 w-4" />
                        )}
                      </div>
                    </label>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={uploadAvatar}
                      disabled={uploading}
                      className="hidden"
                    />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Click the camera icon to upload a new picture
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    JPG, PNG or GIF (max 5MB)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input value={localProfile.email} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
              </div>

              <div>
                <Label>Full Name</Label>
                <Input
                  value={localProfile.full_name || ''}
                  onChange={(e) => updateField('full_name', e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <Label>Phone</Label>
                <Input
                  value={localProfile.phone || ''}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="Enter your phone number"
                />
              </div>
            </CardContent>
          </Card>

          {/* Professional Information */}
          <Card>
            <CardHeader>
              <CardTitle>Professional Information</CardTitle>
              <CardDescription>Your work and business details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Company</Label>
                <Input
                  value={localProfile.company || ''}
                  onChange={(e) => updateField('company', e.target.value)}
                  placeholder="Enter your company name"
                />
              </div>

              <div>
                <Label>Job Title</Label>
                <Input
                  value={localProfile.job_title || ''}
                  onChange={(e) => updateField('job_title', e.target.value)}
                  placeholder="Enter your job title"
                />
              </div>

              <div>
                <Label>Website</Label>
                <Input
                  value={localProfile.website || ''}
                  onChange={(e) => updateField('website', e.target.value)}
                  placeholder="https://yourwebsite.com"
                />
              </div>
            </CardContent>
          </Card>

          {/* Bio */}
          <Card>
            <CardHeader>
              <CardTitle>About</CardTitle>
              <CardDescription>Tell us about yourself</CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <Label>Bio</Label>
                <Textarea
                  value={localProfile.bio || ''}
                  onChange={(e) => updateField('bio', e.target.value)}
                  placeholder="Write a short bio about yourself..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {hasChanges && (
          <div className="flex justify-end space-x-2">
            <Button onClick={resetChanges} variant="outline">
              Reset Changes
            </Button>
            <Button onClick={saveProfile} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </div>
        )}
      </div>
    </RequireAuth>
  )
}