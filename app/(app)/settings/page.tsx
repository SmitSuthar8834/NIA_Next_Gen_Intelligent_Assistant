"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-realtime-data"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, Bell, Shield, CreditCard, Palette, Save } from "lucide-react"
import RequireAuth from "@/components/RequireAuth"

function getInitials(email: string) {
  return email.split('@')[0].slice(0, 2).toUpperCase()
}

export default function SettingsPage() {
  const { user, loading } = useAuth()

  // notification and theme state (unchanged)
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    marketing: false
  })
  const [theme, setTheme] = useState("light")

  // Controlled form state for editable profile fields
  const [form, setForm] = useState({
    name: "",
    company: "",
    role: "" // e.g. "sales-manager"
  })

  // initialize form when user becomes available
  useEffect(() => {
    if (user) {
      setForm({
        name: user.user_metadata?.full_name || "",
        company: user.user_metadata?.company || "",
        role: user.user_metadata?.role || ""
      })
    }
  }, [user])

  if (loading) {
    return (
      <RequireAuth>
        <div className="space-y-6">
          <div>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <div className="grid gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </RequireAuth>
    )
  }

  if (!user) {
    return (
      <RequireAuth>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-muted-foreground">❌ Not logged in</p>
            <Button className="mt-4">Sign In</Button>
          </div>
        </div>
      </RequireAuth>
    )
  }

  // handlers
  const handleChange = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [key]: e.target.value }))
  }

  const handleRoleChange = (value: string) => {
    setForm(prev => ({ ...prev, role: value }))
  }

  const handleSave = () => {
    // TODO: call API to persist updated profile. Example:
    // await updateProfile({ full_name: form.name, company: form.company, role: form.role })
    console.log("save", form)
  }

  return (
    <RequireAuth>
      <div className="space-y-6">

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User size={16} />
              Profile
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell size={16} />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield size={16} />
              Security
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2">
              <CreditCard size={16} />
              Billing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal information and profile settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-4">
                  {/* <Avatar className="w-20 h-20">
                    <AvatarImage src={`https://i.pravatar.cc/150?u=${user.email}`} />
                    <AvatarFallback className="text-lg">
                      {getInitials(user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Button variant="outline" size="sm">
                      Change Avatar
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">
                      JPG, GIF or PNG. 1MB max.
                    </p>
                  </div> */}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    {/* email is not editable: keep disabled + readOnly */}
                    <Input id="email" value={user.email} disabled readOnly />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name" >Full Name</Label>
                    {/* controlled input with onChange */}
                    <Input 
                      id="name" 
                      value={user.full_name}
                      onChange={handleChange("name")}
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input 
                      id="company"
                      value={user.company}
                      onChange={handleChange("company")}
                      placeholder="Enter your company name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={form.role} onValueChange={handleRoleChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sales-manager">Sales Manager</SelectItem>
                        <SelectItem value="sales-rep">Sales Representative</SelectItem>
                        <SelectItem value="account-manager">Account Manager</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSave}>
                    <Save size={16} className="mr-2" />
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Choose how you want to be notified about updates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications via email
                      </p>
                    </div>
                    <Switch 
                      checked={notifications.email}
                      onCheckedChange={(checked) => 
                        setNotifications(prev => ({ ...prev, email: checked }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Push Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive push notifications in your browser
                      </p>
                    </div>
                    <Switch 
                      checked={notifications.push}
                      onCheckedChange={(checked) => 
                        setNotifications(prev => ({ ...prev, push: checked }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Marketing Emails</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive emails about new features and updates
                      </p>
                    </div>
                    <Switch 
                      checked={notifications.marketing}
                      onCheckedChange={(checked) => 
                        setNotifications(prev => ({ ...prev, marketing: checked }))
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Manage your account security and privacy
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label>Password</Label>
                    <div className="flex items-center space-x-2 mt-2">
                      {/* make password input readOnly to avoid the value-without-onChange error */}
                      <Input type="password" value="••••••••" readOnly />
                      <Button variant="outline">Change</Button>
                    </div>
                  </div>
                  <div>
                    <Label>Two-Factor Authentication</Label>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-sm text-muted-foreground">
                        Add an extra layer of security to your account
                      </p>
                      <Button variant="outline">Enable</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Billing & Subscription</CardTitle>
                <CardDescription>
                  Manage your subscription and billing information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Current Plan</h3>
                    <p className="text-sm text-muted-foreground">
                      You are currently on the Free plan
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    Free
                  </Badge>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-medium">Upgrade to Pro</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Advanced AI insights and automation</li>
                    <li>• Unlimited leads and meetings</li>
                    <li>• Priority support</li>
                    <li>• Custom integrations</li>
                  </ul>
                  <Button>Upgrade to Pro - $29/month</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </RequireAuth>
  )
}
