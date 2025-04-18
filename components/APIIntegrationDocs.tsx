import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Code, Copy, Check } from 'lucide-react-native';
import { useState } from 'react';

interface APIIntegrationDocsProps {
  businessId: string;
  apiKey: string;
}

export default function APIIntegrationDocs({ businessId, apiKey }: APIIntegrationDocsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const baseUrl = 'https://scanperks.app/api/v1';
  
  const curlExample = `curl -X POST ${baseUrl}/qr/generate \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "businessId": "${businessId}",
    "transactionId": "YOUR_TRANSACTION_ID",
    "amount": 25.50,
    "metadata": {
      "orderId": "12345",
      "terminal": "POS-1"
    }
  }'`;

  const nodeExample = `const response = await fetch('${baseUrl}/qr/generate', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ${apiKey}',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    businessId: '${businessId}',
    transactionId: 'YOUR_TRANSACTION_ID',
    amount: 25.50,
    metadata: {
      orderId: '12345',
      terminal: 'POS-1'
    }
  })
});

const data = await response.json();
console.log(data.qrCode); // Base64 encoded QR code image`;

  const pythonExample = `import requests

response = requests.post(
    '${baseUrl}/qr/generate',
    headers={
        'Authorization': 'Bearer ${apiKey}',
        'Content-Type': 'application/json'
    },
    json={
        'businessId': '${businessId}',
        'transactionId': 'YOUR_TRANSACTION_ID',
        'amount': 25.50,
        'metadata': {
            'orderId': '12345',
            'terminal': 'POS-1'
        }
    }
)

data = response.json()
print(data['qrCode'])  # Base64 encoded QR code image`;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.title}>API Integration Guide</Text>
        <Text style={styles.description}>
          Follow these instructions to integrate QR code generation with your POS system.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Authentication</Text>
        <View style={styles.apiKeyContainer}>
          <Text style={styles.apiKeyLabel}>Your API Key:</Text>
          <View style={styles.apiKeyBox}>
            <Text style={styles.apiKey}>{apiKey}</Text>
            <TouchableOpacity 
              style={styles.copyButton} 
              onPress={() => handleCopy(apiKey)}
            >
              {copied ? (
                <Check size={20} color="#16a34a" />
              ) : (
                <Copy size={20} color="#64748b" />
              )}
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.warning}>
          Keep your API key secure and never expose it in client-side code.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Endpoint</Text>
        <View style={styles.endpoint}>
          <Code size={20} color="#64748b" />
          <Text style={styles.endpointText}>POST {baseUrl}/qr/generate</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Request Format</Text>
        <View style={styles.codeBlock}>
          <Text style={styles.code}>{`{
  "businessId": "${businessId}",
  "transactionId": "string",
  "amount": number,
  "metadata": {
    "orderId": "string",
    "terminal": "string",
    // Additional custom fields
  }
}`}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Response Format</Text>
        <View style={styles.codeBlock}>
          <Text style={styles.code}>{`{
  "success": true,
  "qrCode": "base64_encoded_image",
  "expiresAt": "ISO_date_string"
}`}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Code Examples</Text>
        
        <Text style={styles.exampleTitle}>cURL</Text>
        <View style={styles.codeBlock}>
          <Text style={styles.code}>{curlExample}</Text>
          <TouchableOpacity 
            style={styles.copyButton} 
            onPress={() => handleCopy(curlExample)}
          >
            <Copy size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        <Text style={styles.exampleTitle}>Node.js</Text>
        <View style={styles.codeBlock}>
          <Text style={styles.code}>{nodeExample}</Text>
          <TouchableOpacity 
            style={styles.copyButton} 
            onPress={() => handleCopy(nodeExample)}
          >
            <Copy size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        <Text style={styles.exampleTitle}>Python</Text>
        <View style={styles.codeBlock}>
          <Text style={styles.code}>{pythonExample}</Text>
          <TouchableOpacity 
            style={styles.copyButton} 
            onPress={() => handleCopy(pythonExample)}
          >
            <Copy size={20} color="#64748b" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Important Notes</Text>
        <View style={styles.notes}>
          <Text style={styles.note}>
            • QR codes expire after 5 minutes for security
          </Text>
          <Text style={styles.note}>
            • Each QR code can only be scanned once
          </Text>
          <Text style={styles.note}>
            • Include unique transaction IDs to prevent duplicates
          </Text>
          <Text style={styles.note}>
            • Rate limit: 100 requests per minute
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 16,
  },
  apiKeyContainer: {
    marginBottom: 16,
  },
  apiKeyLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  apiKeyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  apiKey: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'monospace',
    color: '#0f172a',
  },
  copyButton: {
    padding: 8,
  },
  warning: {
    fontSize: 14,
    color: '#ef4444',
    fontStyle: 'italic',
  },
  endpoint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 8,
    gap: 12,
  },
  endpointText: {
    fontSize: 16,
    fontFamily: 'monospace',
    color: '#0f172a',
  },
  codeBlock: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  code: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#0f172a',
    lineHeight: 20,
  },
  exampleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  notes: {
    gap: 8,
  },
  note: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
});