// components/MainChatArea.tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function MainChatArea() {
  return (
    <div className="flex flex-col justify-between h-full p-4">
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {/* Replace with mapped chat messages */}
        <div className="bg-muted p-3 rounded-xl max-w-md">Hello! Upload a PDF to begin.</div>
      </div>

      {/* Message input */}
      <div className="flex gap-2 mt-4">
        <Input placeholder="Type your message..." className="flex-1" />
        <Button>Send</Button>
      </div>
    </div>
  );
}
