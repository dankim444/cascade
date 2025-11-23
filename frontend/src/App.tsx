import { PipelineLayout } from './components/PipelineLayout';
import { AuthGuard } from './components/AuthGuard';
import './App.css';

function App() {
  return (
    <AuthGuard>
      <PipelineLayout />
    </AuthGuard>
  );
}

export default App;
