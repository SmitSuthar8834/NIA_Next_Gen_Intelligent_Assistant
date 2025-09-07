'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Mic, Phone } from 'lucide-react';

interface QuickJoinMeetingProps {
  trigger?: React.ReactNode;
  className?: string;
}

export function QuickJoinMeeting({ trigger, className }: QuickJoinMeetingProps) {
  const router = useRouter();
  const [roomId, setRoomId] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleJoin = () => {
    if (roomId.trim()) {
      router.push(`/meeting/${roomId.trim()}`);
      setIsOpen(false);
      setRoomId('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleJoin();
    }
  };

  const defaultTrigger = (
    <Button variant="outline" className={className}>
      <Mic className="w-4 h-4 mr-2" />
      Quick Join
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Join Audio Meeting
          </DialogTitle>
          <DialogDescription>
            Enter a room ID to join an existing audio meeting or create a new one.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Room ID</label>
            <Input
              placeholder="e.g., daily-standup, client-demo-123"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              onKeyPress={handleKeyPress}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              If the room doesn't exist, a new one will be created automatically.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleJoin} disabled={!roomId.trim()}>
            <Phone className="w-4 h-4 mr-2" />
            Join Meeting
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}