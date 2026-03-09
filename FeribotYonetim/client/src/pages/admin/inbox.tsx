import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Archive, Trash2, RefreshCw, Search, CheckCheck, Filter } from "lucide-react";
import UnifiedAdminLayout from "@/components/admin/unified-admin-layout";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Message type
interface InboxMessage {
  id: number;
  senderUserId: number;
  receiverUserId: number;
  subject: string;
  content: string;
  isRead: boolean;
  isArchived: boolean;
  isDeleted: boolean;
  parentId: number | null;
  createdAt: string;
  updatedAt: string;
  sender?: {
    id: number;
    username: string;
    fullName: string | null;
  };
  receiver?: {
    id: number;
    username: string;
    fullName: string | null;
  };
}

const AdminInbox: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("inbox");
  const [selectedMessage, setSelectedMessage] = useState<InboxMessage | null>(null);
  const [messageViewOpen, setMessageViewOpen] = useState(false);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterOptions, setFilterOptions] = useState({
    onlyUnread: false,
    includeArchived: false,
    includeDeleted: false,
  });
  const [composeDialogOpen, setComposeDialogOpen] = useState(false);
  const [newMessage, setNewMessage] = useState({
    receiverUserId: "",
    subject: "",
    content: "",
  });

  // Fetch users for the compose dialog
  const { data: users = [] } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/users");
      return await response.json();
    },
  });

  // Fetch inbox messages
  const { data: inboxMessages = [], isLoading: isLoadingInbox, refetch: refetchInbox } = useQuery({
    queryKey: ["/api/admin/inbox"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/inbox");
      return await response.json();
    },
  });

  // All filtered messages based on the active tab and filters
  const filteredMessages = inboxMessages.filter((message: InboxMessage) => {
    // Basic tab filtering
    if (activeTab === "inbox" && message.isArchived) return false;
    if (activeTab === "inbox" && message.isDeleted) return false;
    if (activeTab === "archived" && !message.isArchived) return false;
    if (activeTab === "trash" && !message.isDeleted) return false;

    // Search term filtering
    if (searchTerm && !message.subject.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !message.content.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    return true;
  });

  // Format date
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd MMM yyyy HH:mm", { locale: tr });
  };

  // Get username or show ID
  const getUsernameOrId = (userId: number) => {
    const user = users.find((u: any) => u.id === userId);
    return user ? (user.fullName || user.username) : `Kullanıcı #${userId}`;
  };

  // Mutations for message actions
  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: number) => {
      await apiRequest("PATCH", `/api/inbox/${messageId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/inbox"] });
      toast({
        title: "Mesaj okundu olarak işaretlendi",
        description: "Mesaj başarıyla okundu olarak işaretlendi.",
      });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: "Mesaj okundu olarak işaretlenemedi.",
        variant: "destructive",
      });
    },
  });

  const archiveMessageMutation = useMutation({
    mutationFn: async (messageId: number) => {
      await apiRequest("PATCH", `/api/inbox/${messageId}/archive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/inbox"] });
      toast({
        title: "Mesaj arşivlendi",
        description: "Mesaj başarıyla arşivlendi.",
      });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: "Mesaj arşivlenemedi.",
        variant: "destructive",
      });
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: number) => {
      await apiRequest("PATCH", `/api/inbox/${messageId}/delete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/inbox"] });
      toast({
        title: "Mesaj çöpe taşındı",
        description: "Mesaj başarıyla çöp kutusuna taşındı.",
      });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: "Mesaj silinemedi.",
        variant: "destructive",
      });
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: async (messageId: number) => {
      await apiRequest("DELETE", `/api/inbox/${messageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/inbox"] });
      toast({
        title: "Mesaj kalıcı olarak silindi",
        description: "Mesaj kalıcı olarak silindi ve geri alınamaz.",
      });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: "Mesaj kalıcı olarak silinemedi.",
        variant: "destructive",
      });
    },
  });

  const replyMutation = useMutation({
    mutationFn: async ({ messageId, content }: { messageId: number; content: string }) => {
      await apiRequest("POST", `/api/inbox/${messageId}/reply`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/inbox"] });
      setReplyDialogOpen(false);
      setReplyContent("");
      toast({
        title: "Yanıt gönderildi",
        description: "Mesajınız başarıyla gönderildi.",
      });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: "Yanıt gönderilemedi.",
        variant: "destructive",
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: typeof newMessage) => {
      await apiRequest("POST", "/api/inbox", {
        ...messageData,
        receiverUserId: parseInt(messageData.receiverUserId),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/inbox"] });
      setComposeDialogOpen(false);
      setNewMessage({
        receiverUserId: "",
        subject: "",
        content: "",
      });
      toast({
        title: "Mesaj gönderildi",
        description: "Mesajınız başarıyla gönderildi.",
      });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: "Mesaj gönderilemedi.",
        variant: "destructive",
      });
    },
  });

  // View a message
  const handleViewMessage = (message: InboxMessage) => {
    setSelectedMessage(message);
    setMessageViewOpen(true);

    // If message is not read, mark it as read
    if (!message.isRead) {
      markAsReadMutation.mutate(message.id);
    }
  };

  // Handler for replying to messages
  const handleReply = () => {
    if (!selectedMessage) return;
    
    replyMutation.mutate({
      messageId: selectedMessage.id,
      content: replyContent,
    });
  };

  // Handler for sending new messages
  const handleSendMessage = () => {
    if (!newMessage.receiverUserId || !newMessage.subject || !newMessage.content) {
      toast({
        title: "Hata",
        description: "Lütfen tüm alanları doldurun.",
        variant: "destructive",
      });
      return;
    }

    sendMessageMutation.mutate(newMessage);
  };

  return (
    <UnifiedAdminLayout>
      <div className="container mx-auto py-6">
        <Card className="border-none shadow-none">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl font-bold">Gelen Kutusu</CardTitle>
                <CardDescription>
                  Mesajlarınızı yönetin, okuyun ve yanıtlayın
                </CardDescription>
              </div>
              <Button onClick={() => setComposeDialogOpen(true)}>
                <Mail className="mr-2 h-4 w-4" /> Yeni Mesaj
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2 w-full max-w-sm">
                <Input
                  placeholder="Mesajlarda ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => refetchInbox()}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Yenile</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Filter className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Filtreler</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setFilterOptions(prev => ({ ...prev, onlyUnread: !prev.onlyUnread }))}
                    >
                      {filterOptions.onlyUnread ? "✓ " : ""}Sadece okunmamışlar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setFilterOptions(prev => ({ ...prev, includeArchived: !prev.includeArchived }))}
                    >
                      {filterOptions.includeArchived ? "✓ " : ""}Arşivlenenleri dahil et
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setFilterOptions(prev => ({ ...prev, includeDeleted: !prev.includeDeleted }))}
                    >
                      {filterOptions.includeDeleted ? "✓ " : ""}Silinenleri dahil et
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <Tabs defaultValue="inbox" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="inbox">Gelen Kutusu</TabsTrigger>
                <TabsTrigger value="archived">Arşiv</TabsTrigger>
                <TabsTrigger value="trash">Çöp Kutusu</TabsTrigger>
              </TabsList>

              <TabsContent value="inbox" className="mt-0">
                <MessageList
                  messages={filteredMessages}
                  isLoading={isLoadingInbox}
                  onView={handleViewMessage}
                  onArchive={(id) => archiveMessageMutation.mutate(id)}
                  onDelete={(id) => deleteMessageMutation.mutate(id)}
                  onMarkAsRead={(id) => markAsReadMutation.mutate(id)}
                  getUsernameOrId={getUsernameOrId}
                  formatDate={formatDate}
                />
              </TabsContent>

              <TabsContent value="archived" className="mt-0">
                <MessageList
                  messages={filteredMessages}
                  isLoading={isLoadingInbox}
                  onView={handleViewMessage}
                  onArchive={(id) => {}} // No archive action for archived messages
                  onDelete={(id) => deleteMessageMutation.mutate(id)}
                  onMarkAsRead={(id) => markAsReadMutation.mutate(id)}
                  getUsernameOrId={getUsernameOrId}
                  formatDate={formatDate}
                />
              </TabsContent>

              <TabsContent value="trash" className="mt-0">
                <div>
                  <div className="rounded-md bg-yellow-50 p-4 mb-4">
                    <div className="flex">
                      <div className="ml-3">
                        <p className="text-sm text-yellow-700">
                          Çöp kutusundaki mesajlar 30 gün sonra otomatik olarak silinir. Kalıcı olarak silmek için işlem menüsünü kullanın.
                        </p>
                      </div>
                    </div>
                  </div>
                  <MessageList
                    messages={filteredMessages}
                    isLoading={isLoadingInbox}
                    onView={handleViewMessage}
                    onArchive={(id) => {}} // No archive action for deleted messages
                    onDelete={(id) => permanentDeleteMutation.mutate(id)}
                    onMarkAsRead={(id) => {}} // No mark as read action for deleted messages
                    getUsernameOrId={getUsernameOrId}
                    formatDate={formatDate}
                    isTrash={true}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Message View Dialog */}
      <Dialog open={messageViewOpen} onOpenChange={setMessageViewOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">{selectedMessage?.subject}</DialogTitle>
            <DialogDescription className="flex justify-between text-base">
              <span>
                <strong>Gönderen:</strong> {selectedMessage ? getUsernameOrId(selectedMessage.senderUserId) : ""}
              </span>
              <span>
                <strong>Tarih:</strong> {selectedMessage ? formatDate(selectedMessage.createdAt) : ""}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 border rounded-lg p-4 min-h-[200px] whitespace-pre-wrap">
            {selectedMessage?.content}
          </div>
          <DialogFooter className="flex justify-between sm:justify-end mt-4">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setReplyDialogOpen(true)}>Yanıtla</Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (selectedMessage) {
                    archiveMessageMutation.mutate(selectedMessage.id);
                    setMessageViewOpen(false);
                  }
                }}
              >
                <Archive className="mr-2 h-4 w-4" /> Arşivle
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (selectedMessage) {
                    deleteMessageMutation.mutate(selectedMessage.id);
                    setMessageViewOpen(false);
                  }
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Sil
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reply Dialog */}
      <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Yanıt: {selectedMessage?.subject}</DialogTitle>
            <DialogDescription>
              Mesajınızı yazın ve gönderin
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <Textarea
              placeholder="Mesajınızı buraya yazın..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              className="min-h-[200px]"
            />
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setReplyDialogOpen(false)}>
              İptal
            </Button>
            <Button 
              onClick={handleReply}
              disabled={!replyContent.trim() || replyMutation.isPending}
            >
              {replyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Gönder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Compose Dialog */}
      <Dialog open={composeDialogOpen} onOpenChange={setComposeDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Yeni Mesaj</DialogTitle>
            <DialogDescription>
              Yeni bir mesaj oluşturun ve gönderin
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recipient">Alıcı</Label>
              <Select
                value={newMessage.receiverUserId}
                onValueChange={(value) => setNewMessage({ ...newMessage, receiverUserId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Alıcı seçin" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user: any) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.fullName || user.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Konu</Label>
              <Input
                id="subject"
                placeholder="Mesaj konusu"
                value={newMessage.subject}
                onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Mesaj</Label>
              <Textarea
                id="content"
                placeholder="Mesajınızı buraya yazın..."
                value={newMessage.content}
                onChange={(e) => setNewMessage({ ...newMessage, content: e.target.value })}
                className="min-h-[200px]"
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setComposeDialogOpen(false)}>
              İptal
            </Button>
            <Button 
              onClick={handleSendMessage}
              disabled={!newMessage.receiverUserId || !newMessage.subject.trim() || !newMessage.content.trim() || sendMessageMutation.isPending}
            >
              {sendMessageMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Gönder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </UnifiedAdminLayout>
  );
};

// Message List Component
interface MessageListProps {
  messages: InboxMessage[];
  isLoading: boolean;
  onView: (message: InboxMessage) => void;
  onArchive: (id: number) => void;
  onDelete: (id: number) => void;
  onMarkAsRead: (id: number) => void;
  getUsernameOrId: (id: number) => string;
  formatDate: (date: string) => string;
  isTrash?: boolean;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  isLoading,
  onView,
  onArchive,
  onDelete,
  onMarkAsRead,
  getUsernameOrId,
  formatDate,
  isTrash = false,
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg">
        <Mail className="h-12 w-12 mx-auto text-gray-400" />
        <h3 className="mt-2 text-lg font-medium text-gray-900">Hiç mesaj yok</h3>
        <p className="mt-1 text-sm text-gray-500">
          {isTrash
            ? "Çöp kutunuz boş."
            : "Gelen kutunuzda henüz hiç mesaj yok."}
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[250px]">Gönderen</TableHead>
          <TableHead>Konu</TableHead>
          <TableHead className="w-[180px]">Tarih</TableHead>
          <TableHead className="w-[100px] text-right">İşlemler</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {messages.map((message) => (
          <TableRow 
            key={message.id}
            className={`cursor-pointer ${!message.isRead ? 'font-medium bg-gray-50' : ''}`}
            onClick={() => onView(message)}
          >
            <TableCell>{getUsernameOrId(message.senderUserId)}</TableCell>
            <TableCell>
              <div className="flex items-center">
                {!message.isRead && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                )}
                {message.subject}
              </div>
            </TableCell>
            <TableCell>{formatDate(message.createdAt)}</TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                        <path d="M3.625 7.5C3.625 8.12132 3.12132 8.625 2.5 8.625C1.87868 8.625 1.375 8.12132 1.375 7.5C1.375 6.87868 1.87868 6.375 2.5 6.375C3.12132 6.375 3.625 6.87868 3.625 7.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.625 6.87868 8.625 7.5ZM13.625 7.5C13.625 8.12132 13.1213 8.625 12.5 8.625C11.8787 8.625 11.375 8.12132 11.375 7.5C11.375 6.87868 11.8787 6.375 12.5 6.375C13.1213 6.375 13.625 6.87868 13.625 7.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                      </svg>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {!message.isRead && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkAsRead(message.id);
                        }}
                      >
                        <CheckCheck className="mr-2 h-4 w-4" />
                        Okundu olarak işaretle
                      </DropdownMenuItem>
                    )}
                    {!isTrash && !message.isArchived && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onArchive(message.id);
                        }}
                      >
                        <Archive className="mr-2 h-4 w-4" />
                        Arşivle
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(message.id);
                      }}
                      className={isTrash ? "text-red-600" : ""}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {isTrash ? "Kalıcı olarak sil" : "Sil"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default AdminInbox;