import { useParams } from 'react-router-dom';
import EditorPane from '../pages/Editor';

export default function EditorRoute() {
  const { docId } = useParams();
  return <EditorPane docId={docId} />;
}