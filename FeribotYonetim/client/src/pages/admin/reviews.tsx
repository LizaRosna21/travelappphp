import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/layouts/admin-layout';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SearchIcon, Trash2, Star, Check, X, MessageSquare, ThumbsUp } from 'lucide-react';

interface Review {
  id: number;
  userId: number;
  routeId: number;
  rating: number;
  comment: string;
  title: string;
  status: 'pending' | 'approved' | 'rejected';
  isVerified: boolean;
  isHelpful: number;
  adminResponse: string;
  userName: string;
  routeName: string;
}

export default function ReviewsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentReview, setCurrentReview] = useState<Review | null>(null);
  const [adminResponse, setAdminResponse] = useState('');
  const [isResponseDialogOpen, setIsResponseDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  
  const { data: reviews, isLoading, error } = useQuery<Review[]>({
    queryKey: ['/api/admin/reviews'],
  });

  const updateReviewMutation = useMutation({
    mutationFn: async (updatedReview: Partial<Review> & { id: number }) => {
      const res = await apiRequest(
        'PUT', 
        `/api/admin/reviews/${updatedReview.id}`, 
        updatedReview
      );
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Review updated',
        description: 'The review has been updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/reviews'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update review: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      const res = await apiRequest(
        'PATCH', 
        `/api/admin/reviews/${id}/status`, 
        { status }
      );
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Status updated',
        description: 'The review status has been updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/reviews'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update status: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const deleteReviewMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest(
        'DELETE', 
        `/api/admin/reviews/${id}`, 
        {}
      );
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Review deleted',
        description: 'The review has been deleted successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/reviews'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete review: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const handleResponseSubmit = async () => {
    if (!currentReview) return;
    
    await updateReviewMutation.mutateAsync({
      id: currentReview.id,
      adminResponse
    });
    
    setIsResponseDialogOpen(false);
  };

  const handleStatusChange = async (id: number, status: string) => {
    await updateStatusMutation.mutateAsync({ id, status });
  };

  const openResponseDialog = (review: Review) => {
    setCurrentReview(review);
    setAdminResponse(review.adminResponse || '');
    setIsResponseDialogOpen(true);
  };

  const handleDeleteReview = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this review?')) {
      await deleteReviewMutation.mutateAsync(id);
    }
  };

  const filteredReviews = reviews
    ? reviews.filter(review => {
        // Filter by tab
        if (activeTab !== 'all' && review.status !== activeTab) {
          return false;
        }
        
        // Filter by search term
        return (
          review.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          review.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          review.comment.toLowerCase().includes(searchTerm.toLowerCase()) ||
          review.routeName.toLowerCase().includes(searchTerm.toLowerCase())
        );
      })
    : [];

  if (error) {
    return (
      <AdminLayout>
        <Card>
          <CardHeader>
            <CardTitle className="text-red-500">Error Loading Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Failed to load reviews: {(error as Error).message}</p>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500">Rejected</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">Pending</Badge>;
      default:
        return <Badge className="bg-gray-500">{status}</Badge>;
    }
  };

  const renderStars = (rating: number) => {
    return Array(5).fill(0).map((_, i) => (
      <Star 
        key={i} 
        className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
      />
    ));
  };

  return (
    <AdminLayout>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Customer Reviews</CardTitle>
          <CardDescription>
            Manage customer reviews for your ferry routes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search reviews by name, title, or content..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
                <TabsTrigger value="rejected">Rejected</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No reviews found matching your criteria</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Title & Review</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReviews.map((review) => (
                    <TableRow key={review.id}>
                      <TableCell className="font-medium">{review.userName}</TableCell>
                      <TableCell>{review.routeName}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {renderStars(review.rating)}
                          <span className="ml-2 text-sm font-medium">{review.rating}/5</span>
                        </div>
                        <div className="flex items-center mt-1 text-xs text-gray-500">
                          <ThumbsUp className="w-3 h-3 mr-1" /> {review.isHelpful} helpful
                          {review.isVerified && (
                            <Badge variant="outline" className="ml-2 h-5 text-green-600 border-green-600">
                              <Check className="w-3 h-3 mr-1" /> Verified
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{review.title}</p>
                          <p className="text-sm text-gray-500 line-clamp-2">{review.comment}</p>
                          {review.adminResponse && (
                            <div className="mt-2 border-l-2 border-primary pl-2">
                              <p className="text-xs font-medium text-gray-600">Admin Response:</p>
                              <p className="text-xs text-gray-500 line-clamp-2">{review.adminResponse}</p>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(review.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {review.status === 'pending' && (
                            <>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-8 w-8 p-0 text-green-600" 
                                onClick={() => handleStatusChange(review.id, 'approved')}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-8 w-8 p-0 text-red-600" 
                                onClick={() => handleStatusChange(review.id, 'rejected')}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 w-8 p-0 text-blue-600" 
                            onClick={() => openResponseDialog(review)}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 w-8 p-0 text-red-600" 
                            onClick={() => handleDeleteReview(review.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isResponseDialogOpen} onOpenChange={setIsResponseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Respond to Review</DialogTitle>
          </DialogHeader>

          {currentReview && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-md">
                <p className="font-medium">{currentReview.title}</p>
                <div className="flex items-center my-1">
                  {renderStars(currentReview.rating)}
                </div>
                <p className="text-sm text-gray-600">{currentReview.comment}</p>
                <p className="text-xs text-gray-500 mt-2">- {currentReview.userName}</p>
              </div>

              <div>
                <label htmlFor="adminResponse" className="text-sm font-medium">
                  Your Response
                </label>
                <Textarea
                  id="adminResponse"
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  placeholder="Write your response to this review..."
                  rows={5}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResponseDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleResponseSubmit} disabled={updateReviewMutation.isPending}>
              {updateReviewMutation.isPending ? "Submitting..." : "Submit Response"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}