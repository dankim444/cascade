import React, { useState } from 'react';
import { useWorkflowStore } from './store/useWorkflowStore';

const TestApp: React.FC = () => {
  const [testResult, setTestResult] = useState<string>('');
  const { executePipeline, addNode, nodes } = useWorkflowStore();

  const testBackendConnection = async () => {
    try {
      setTestResult('Testing backend connection...');
      
      // Test the transformation API
      const result = await executePipeline();
      
      if (result.status === 'success') {
        setTestResult(`✅ Backend connection successful! Result: ${JSON.stringify(result, null, 2)}`);
      } else {
        setTestResult(`❌ Backend returned error: ${result.message}`);
      }
    } catch (error) {
      setTestResult(`❌ Backend connection failed: ${error}`);
    }
  };

  const addTestNode = () => {
    const testNode = {
      id: `test-${Date.now()}`,
      transform: {
        operation: 'select' as const,
        params: [JSON.stringify(['name', 'age'])]
      },
      data: 'test_data',
      position: { x: 100, y: 100 }
    };
    
    addNode(testNode);
    setTestResult(`Added test node. Total nodes: ${nodes.length + 1}`);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Cascade Frontend Test</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={testBackendConnection}
          style={{ 
            padding: '10px 20px', 
            marginRight: '10px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Test Backend Connection
        </button>
        
        <button 
          onClick={addTestNode}
          style={{ 
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Add Test Node
        </button>
      </div>
      
      <div style={{ 
        padding: '15px', 
        backgroundColor: '#f8f9fa', 
        border: '1px solid #dee2e6',
        borderRadius: '4px',
        minHeight: '100px'
      }}>
        <h3>Test Results:</h3>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {testResult || 'No tests run yet. Click a button above to test.'}
        </pre>
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <h3>Current Nodes: {nodes.length}</h3>
        {nodes.map(node => (
          <div key={node.id} style={{ 
            padding: '10px', 
            margin: '5px 0', 
            backgroundColor: '#e9ecef',
            borderRadius: '4px'
          }}>
            <strong>{node.id}</strong> - {node.transform.operation}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TestApp;
