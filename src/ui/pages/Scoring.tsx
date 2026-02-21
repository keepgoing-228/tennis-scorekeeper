import { useParams } from "react-router";

export default function Scoring() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="flex items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold">Scoring: {id}</h1>
    </div>
  );
}
