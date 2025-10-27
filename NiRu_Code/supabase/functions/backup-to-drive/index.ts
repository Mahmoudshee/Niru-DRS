import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { JSZip } from 'https://deno.land/x/jszip@0.11.0/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}


async function getGoogleAccessToken(): Promise<string> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')
  const refreshToken = Deno.env.get('GOOGLE_REFRESH_TOKEN')

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing Google Drive credentials')
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to get Google access token')
  }

  const data: GoogleTokenResponse = await response.json()
  return data.access_token
}

async function uploadToGoogleDrive(filename: string, content: Uint8Array, accessToken: string): Promise<string> {
  // Create file metadata
  const metadata = {
    name: filename,
    parents: [] // Will go to root folder, you can specify a folder ID here
  }

  // Create multipart upload
  const boundary = '-------314159265358979323846'
  const delimiter = `\r\n--${boundary}\r\n`
  const close_delim = `\r\n--${boundary}--`

  const metadataBody = delimiter + 
    'Content-Type: application/json\r\n\r\n' + 
    JSON.stringify(metadata)

  const mediaBody = delimiter + 
    'Content-Type: application/zip\r\n\r\n'

  const body = new Uint8Array([
    ...new TextEncoder().encode(metadataBody),
    ...new TextEncoder().encode(mediaBody),
    ...content,
    ...new TextEncoder().encode(close_delim)
  ])

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary="${boundary}"`,
      'Content-Length': body.length.toString(),
    },
    body: body,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to upload to Google Drive: ${errorText}`)
  }

  const result = await response.json()
  return result.id
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Starting backup process...')
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get Google access token
    console.log('Getting Google access token...')
    const accessToken = await getGoogleAccessToken()

    // Export requisitions data
    console.log('Exporting requisitions data...')
    const { data: requisitions, error: reqError } = await supabase
      .from('requisitions')
      .select('*')
      .order('createdAt', { ascending: false })

    if (reqError) {
      throw new Error(`Failed to fetch requisitions: ${reqError.message}`)
    }

    // Export audit logs data
    console.log('Exporting audit logs data...')
    const { data: auditLogs, error: auditError } = await supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })

    if (auditError) {
      throw new Error(`Failed to fetch audit logs: ${auditError.message}`)
    }

    // Get list of files from requisition-documents bucket
    console.log('Getting list of files from storage...')
    const { data: files, error: filesError } = await supabase
      .storage
      .from('requisition-documents')
      .list('', { limit: 1000, sortBy: { column: 'created_at', order: 'desc' } })

    if (filesError) {
      throw new Error(`Failed to list files: ${filesError.message}`)
    }

    // Create backup zip file
    console.log('Creating backup zip file...')
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const zip = new JSZip()
    
    // Add requisitions JSON to zip
    console.log('Adding requisitions data to zip...')
    const requisitionsJson = JSON.stringify(requisitions || [], null, 2)
    zip.addFile('requisitions.json', requisitionsJson)
    
    // Add audit logs JSON to zip
    console.log('Adding audit logs data to zip...')
    const auditLogsJson = JSON.stringify(auditLogs || [], null, 2)
    zip.addFile('audit_logs.json', auditLogsJson)
    
    // Download and add actual files from storage to zip
    console.log('Adding storage files to zip...')
    let downloadedFilesCount = 0
    const documentFiles: string[] = []
    
    if (files && files.length > 0) {
      for (const file of files) {
        try {
          console.log(`Processing file: ${file.name}`)
          const { data: fileData, error: downloadError } = await supabase
            .storage
            .from('requisition-documents')
            .download(file.name)
          
          if (downloadError) {
            console.error(`Failed to download ${file.name}:`, downloadError)
            continue
          }
          
          if (fileData) {
            const fileBytes = new Uint8Array(await fileData.arrayBuffer())
            zip.addFile(`documents/${file.name}`, fileBytes)
            documentFiles.push(file.name)
            downloadedFilesCount++
            console.log(`Added to zip: ${file.name}`)
          }
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error)
        }
      }
    }
    
    // Add backup metadata to zip
    const backupMetadata = {
      timestamp: new Date().toISOString(),
      total_requisitions: (requisitions || []).length,
      total_audit_logs: (auditLogs || []).length,
      total_files: (files || []).length,
      downloaded_files: downloadedFilesCount,
      files_included: {
        requisitions: 'requisitions.json',
        audit_logs: 'audit_logs.json',
        documents: documentFiles
      }
    }
    
    zip.addFile('backup_info.json', JSON.stringify(backupMetadata, null, 2))
    
    // Generate zip file
    console.log('Generating zip file...')
    const zipBytes = await zip.generateAsync({ type: "uint8array" })
    
    // Upload zip to Google Drive
    console.log('Uploading zip to Google Drive...')
    const zipFileId = await uploadToGoogleDrive(
      `niru-backup-${timestamp}.zip`, 
      zipBytes, 
      accessToken
    )

    console.log('Backup completed successfully')

    return new Response(JSON.stringify({
      success: true,
      message: 'Backup completed successfully',
      backup_file: `niru-backup-${timestamp}.zip`,
      google_drive_file_id: zipFileId,
      backup_stats: {
        requisitions_count: (requisitions || []).length,
        audit_logs_count: (auditLogs || []).length,
        total_files: (files || []).length,
        downloaded_files: downloadedFilesCount
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Backup failed:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})