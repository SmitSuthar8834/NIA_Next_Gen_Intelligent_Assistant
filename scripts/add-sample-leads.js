const { createClient } = require('@supabase/supabase-js')

// You'll need to set these environment variables or replace with your actual values
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'your-supabase-url'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-supabase-anon-key'

const supabase = createClient(supabaseUrl, supabaseKey)

const sampleLeads = [
  {
    name: 'John Smith',
    email: 'john.smith@techcorp.com',
    phone: '+1-555-0123',
    company: 'TechCorp Solutions',
    status: 'new',
    source: 'manual'
  },
  {
    name: 'Sarah Johnson',
    email: 'sarah.j@innovate.io',
    phone: '+1-555-0456',
    company: 'Innovate.io',
    status: 'contacted',
    source: 'manual'
  },
  {
    name: 'Mike Chen',
    email: 'mike.chen@startupx.com',
    phone: '+1-555-0789',
    company: 'StartupX',
    status: 'qualified',
    source: 'manual'
  },
  {
    name: 'Emily Davis',
    email: 'emily@growthco.com',
    phone: '+1-555-0321',
    company: 'GrowthCo',
    status: 'new',
    source: 'manual'
  }
]

async function addSampleLeads() {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('No authenticated user found. Please login first.')
      return
    }

    console.log(`Adding sample leads for user: ${user.email}`)

    // Add user_id to each lead
    const leadsWithUserId = sampleLeads.map(lead => ({
      ...lead,
      user_id: user.id
    }))

    // Insert sample leads
    const { data, error } = await supabase
      .from('leads')
      .insert(leadsWithUserId)
      .select()

    if (error) {
      console.error('Error adding sample leads:', error)
      return
    }

    console.log(`Successfully added ${data.length} sample leads:`)
    data.forEach(lead => {
      console.log(`- ${lead.name} (${lead.company}) - ${lead.status}`)
    })

  } catch (error) {
    console.error('Error:', error)
  }
}

addSampleLeads()