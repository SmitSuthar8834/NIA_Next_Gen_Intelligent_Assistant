"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar as UiCalendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Bot,
  Video,
  Edit,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";
import { useUser } from "@/hooks/useUser";
import { ScheduledMeeting } from "@/types/meetings";

interface MeetingCalendarViewProps {
  meetings?: ScheduledMeeting[]; // optional prop from parent (single source of truth)
  loading?: boolean; // optional loading override from parent
  refreshToken?: number; // optional token to force refetch when using internal fetch
  onMeetingSelect?: (meeting: ScheduledMeeting) => void;
  onEditMeeting?: (meeting: ScheduledMeeting) => void;
  onDeleteMeeting?: (meetingId: string) => void;
}

export default function MeetingCalendarView({
  meetings: incomingMeetings,
  loading: incomingLoading,
  refreshToken,
  onMeetingSelect,
  onEditMeeting,
  onDeleteMeeting,
}: MeetingCalendarViewProps) {
  const { user, access_token } = useUser();
  const router = useRouter();

  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [meetings, setMeetings] = useState<ScheduledMeeting[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [selectedMeeting, setSelectedMeeting] =
    useState<ScheduledMeeting | null>(null);
  const [showMeetingDetails, setShowMeetingDetails] = useState(false);
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");

  // If parent provided loading prop, prefer it
  useEffect(() => {
    if (typeof incomingLoading === "boolean") {
      setLoading(incomingLoading);
    }
  }, [incomingLoading]);

  // If parent provided meetings prop, use it as authoritative source
  useEffect(() => {
    if (Array.isArray(incomingMeetings)) {
      setMeetings(incomingMeetings);
      return;
    }
  }, [incomingMeetings]);

  // Fetch meetings when currentDate changes or refreshToken changes, only when incomingMeetings not provided
  useEffect(() => {
    if (Array.isArray(incomingMeetings)) {
      // parent controls meetings; don't fetch
      return;
    }
    fetchMeetings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, refreshToken, incomingMeetings]);

  const fetchMeetings = async () => {
    if (!access_token) return;
    try {
      setLoading(true);

      const startDate = startOfMonth(currentDate);
      const endDate = endOfMonth(currentDate);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/scheduled-meetings/?` +
          `start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`,
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const meetingsArray: ScheduledMeeting[] = data.meetings || data || [];
        setMeetings(meetingsArray);
      } else {
        console.warn("Failed to fetch meetings:", response.status);
      }
    } catch (err) {
      console.error("Failed to fetch meetings:", err);
    } finally {
      setLoading(false);
    }
  };

  const getMeetingsForDate = (date: Date) => {
    return meetings.filter((meeting) =>
      isSameDay(new Date(meeting.scheduled_time), date)
    );
  };

  const getStatusColor = (status: ScheduledMeeting["status"]) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-500";
      case "active":
        return "bg-green-500";
      case "completed":
        return "bg-gray-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusBadgeVariant = (status: ScheduledMeeting["status"]) => {
    switch (status) {
      case "scheduled":
        return "default";
      case "active":
        return "default";
      case "completed":
        return "secondary";
      case "cancelled":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const handleMeetingClick = (meeting: ScheduledMeeting) => {
    router.push(`/meetings/${meeting.id}`);
    if (onMeetingSelect) onMeetingSelect(meeting);
  };

  const handleJoinMeeting = (meeting: ScheduledMeeting) => {
    if (meeting.join_link) {
      window.open(meeting.join_link, "_blank");
    } else {
      window.open(`/meetings/join/${meeting.meeting_room_id}`, "_blank");
    }
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) =>
      direction === "prev" ? subMonths(prev, 1) : addMonths(prev, 1)
    );
  };

  /*
    Small helper presentational component for compact meeting pill used inside a day cell.
    We intentionally keep HTML/CSS simple and purely Tailwind so it is responsive.
  */
  const MeetingPill = ({ meeting }: { meeting: ScheduledMeeting }) => {
    const color = getStatusColor(meeting.status).replace("bg-", "");
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleMeetingClick(meeting);
        }}
        className="w-full text-left p-1 rounded-md flex items-center gap-2 text-[11px] sm:text-xs truncate focus:outline-none focus:ring-2 focus:ring-offset-1"
        aria-label={`Open meeting ${meeting.lead?.name || meeting.id}`}
        style={{
          backgroundColor: `${getStatusColor(meeting.status)}20`,
        }}
      >
        <span
          className={`w-2 h-2 rounded-full ${getStatusColor(meeting.status)}`}
          aria-hidden
        />
        <div className="flex-1 truncate">
          <div className="truncate font-medium">
            {format(new Date(meeting.scheduled_time), "HH:mm")} • {meeting.lead?.name || "Meeting"}
          </div>
          <div className="text-muted-foreground truncate text-[10px]">
            {meeting.lead?.company || meeting.question_set?.name || ''}
          </div>
        </div>
      </button>
    );
  };

  const renderCalendarDay = (date: Date) => {
    const dayMeetings = getMeetingsForDate(date);
    const isSelected = selectedDate && isSameDay(date, selectedDate);

    return (
      <div
        className={`min-h-[96px] sm:min-h-[120px] p-2 border-r border-b cursor-pointer hover:bg-muted/40 transition-colors flex flex-col justify-start gap-2 ${
          isSelected ? "ring-2 ring-primary/40 rounded-md" : ""
        }`}
        onClick={() => setSelectedDate(date)}
      >
        <div className="flex items-start justify-between">
          <div className="font-medium text-sm">{format(date, "d")}</div>
          <div className="text-[11px] text-muted-foreground hidden sm:block">
            {format(date, "EEE")}
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-1 overflow-hidden">
          {dayMeetings.slice(0, 4).map((meeting) => (
            <MeetingPill key={meeting.id} meeting={meeting} />
          ))}

          {dayMeetings.length > 4 && (
            <div className="text-[12px] text-muted-foreground mt-1">+{dayMeetings.length - 4} more</div>
          )}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Pad to start on Sunday
    const startDay = monthStart.getDay();
    const paddedDays = Array(startDay).fill(null).concat(days);

    // Pad to complete the grid (6 weeks)
    while (paddedDays.length < 42) {
      paddedDays.push(null);
    }

    return (
      <div className="overflow-auto">
        <div className="grid grid-cols-7 text-center border-l border-t">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day=> (
            <div key={day} className="p-2 border-r border-b bg-muted font-medium text-[13px] sm:text-sm">
              {day}
            </div>
          ))}

          {paddedDays.map((date, index) => (
            <div key={index} className="break-words">
              {date ? (
                renderCalendarDay(date)
              ) : (
                <div className="min-h-[96px] sm:min-h-[120px] border-r border-b bg-muted/30" />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    if (!selectedDate) return (
      <div className="p-8 text-center text-muted-foreground">Select a day to view details</div>
    );

    const dayMeetings = getMeetingsForDate(selectedDate);

    return (
      <div className="space-y-4">
        <div className="text-lg font-medium">
          {format(selectedDate, "EEEE, MMMM d, yyyy")}
        </div>

        {dayMeetings.length > 0 ? (
          <div className="space-y-3">
            {dayMeetings
              .sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime())
              .map((meeting) => (
                <Card key={meeting.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="w-full sm:w-auto flex items-center gap-3">
                      <div className="text-lg font-bold">{format(new Date(meeting.scheduled_time), "HH:mm")}</div>
                      <Badge variant={getStatusBadgeVariant(meeting.status)}>{meeting.status}</Badge>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 text-sm">
                        <User className="w-4 h-4" />
                        <span className="font-medium truncate">{meeting.lead?.name}</span>
                        {meeting.lead?.company && <span className="text-muted-foreground truncate">• {meeting.lead.company}</span>}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1"><Clock className="w-3 h-3" />{meeting.duration_minutes} minutes</div>
                        {meeting.question_set && <div className="flex items-center gap-1"><Bot className="w-3 h-3" />{meeting.question_set.name}</div>}
                        {meeting.participants_joined > 0 && <div className="flex items-center gap-1"><User className="w-3 h-3" />{meeting.participants_joined} joined</div>}
                      </div>
                    </div>

                    <div className="flex gap-2 items-center">
                      {meeting.status === 'scheduled' && (
                        <Button size="sm" onClick={() => handleJoinMeeting(meeting)}>
                          <Video className="w-4 h-4 mr-1" />Join
                        </Button>
                      )}

                      <Button variant="outline" size="sm" onClick={() => handleMeetingClick(meeting)}>
                        <ExternalLink className="w-4 h-4" />
                      </Button>

                      {onEditMeeting && (<Button variant="outline" size="sm" onClick={() => onEditMeeting(meeting)}><Edit className="w-4 h-4" /></Button>)}
                      {onDeleteMeeting && (<Button variant="outline" size="sm" onClick={() => onDeleteMeeting(meeting.id)}><Trash2 className="w-4 h-4" /></Button>)}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">No meetings scheduled for this day</div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <CardTitle className="flex items-center gap-2 truncate">
                <CalendarIcon className="w-5 h-5" />
                <span className="truncate">Meeting Calendar</span>
              </CardTitle>
              <CardDescription className="truncate">View and manage scheduled AI meetings</CardDescription>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex border rounded-md overflow-hidden">
                <Button variant={viewMode === "month" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("month")}>Month</Button>
                <Button variant={viewMode === "day" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("day") } disabled={!selectedDate}>Day</Button>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')} aria-label="Previous month"><ChevronLeft className="w-4 h-4" /></Button>

                <div className="min-w-[140px] text-center font-medium text-sm">{format(currentDate, 'MMMM yyyy')}</div>

                <Button variant="outline" size="sm" onClick={() => navigateMonth('next')} aria-label="Next month"><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Calendar Content */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-center text-muted-foreground">Loading meetings...</div>
          ) : viewMode === "month" ? (
            renderMonthView()
          ) : (
            renderDayView()
          )}
        </CardContent>
      </Card>

      {/* Compact legend for readability */}
      <div className="flex gap-3 flex-wrap text-sm">
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500"/> Scheduled</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500"/> Active</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-gray-500"/> Completed</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500"/> Cancelled</div>
      </div>

      {/* Meeting Details Dialog (fallback if parent didn't handle onMeetingSelect) */}
      <Dialog open={showMeetingDetails} onOpenChange={setShowMeetingDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CalendarIcon className="w-5 h-5"/> Meeting Details</DialogTitle>
            <DialogDescription>{selectedMeeting && format(new Date(selectedMeeting.scheduled_time), "PPP p")}</DialogDescription>
          </DialogHeader>

          {selectedMeeting && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Lead</div>
                  <div className="flex items-center gap-2"><User className="w-4 h-4" /><span>{selectedMeeting.lead?.name ?? 'Unknown Lead'}</span></div>
                  {selectedMeeting.lead?.company && <div className="text-sm text-muted-foreground ml-6">{selectedMeeting.lead.company}</div>}
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground">Status</div>
                  <Badge variant={getStatusBadgeVariant(selectedMeeting.status)}>{selectedMeeting.status}</Badge>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground">Duration</div>
                  <div className="flex items-center gap-2"><Clock className="w-4 h-4"/>
                  <span>{selectedMeeting.duration_minutes} minutes</span></div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground">Room ID</div>
                  <div className="font-mono text-sm">{selectedMeeting.meeting_room_id}</div>
                </div>
              </div>

              {selectedMeeting.question_set && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">Question Set</div>
                  <div className="flex items-center gap-2 p-3 border rounded-md"><Bot className="w-4 h-4" /><span>{selectedMeeting.question_set.name}</span></div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-center p-3 border rounded-md"><div className="text-2xl font-bold">{selectedMeeting.participants_joined}</div><div className="text-sm text-muted-foreground">Participants</div></div>
                <div className="text-center p-3 border rounded-md"><div className="text-2xl font-bold">{selectedMeeting.ai_joined_at ? "✓" : "—"}</div><div className="text-sm text-muted-foreground">AI Joined</div></div>
                <div className="text-center p-3 border rounded-md"><div className="text-2xl font-bold">{format(new Date(selectedMeeting.created_at), "MMM d")}</div><div className="text-sm text-muted-foreground">Scheduled</div></div>
              </div>

              <div className="flex gap-3 pt-4">
                {selectedMeeting.status === "scheduled" && (<Button onClick={() => handleJoinMeeting(selectedMeeting)}><Video className="w-4 h-4 mr-2"/>Join Meeting</Button>)}

                {onEditMeeting && (<Button variant="outline" onClick={() => { onEditMeeting(selectedMeeting); setShowMeetingDetails(false); }}><Edit className="w-4 h-4 mr-2"/>Edit</Button>)}

                {onDeleteMeeting && (<Button variant="destructive" onClick={() => { onDeleteMeeting(selectedMeeting.id); setShowMeetingDetails(false); }}><Trash2 className="w-4 h-4 mr-2"/>Delete</Button>)}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
