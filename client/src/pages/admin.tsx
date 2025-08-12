import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Database, 
  Users, 
  Building2, 
  Ambulance, 
  AlertTriangle, 
  Bed, 
  MessageSquare,
  Plus,
  Trash2,
  Edit,
  RotateCcw,
  Download,
  Upload
} from "lucide-react";

interface TableData {
  columns: string[];
  rows: any[][];
  count: number;
}

const TABLE_CONFIGS = {
  users: { icon: Users, name: "Users", description: "User accounts and profiles" },
  hospitals: { icon: Building2, name: "Hospitals", description: "Hospital facilities and information" },
  ambulances: { icon: Ambulance, name: "Ambulances", description: "Ambulance fleet and operators" },
  emergency_requests: { icon: AlertTriangle, name: "Emergency Requests", description: "Emergency calls and dispatches" },
  bed_status_logs: { icon: Bed, name: "Bed Status", description: "Hospital bed availability logs" },
  communications: { icon: MessageSquare, name: "Communications", description: "System messages and chats" }
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const { lastMessage } = useWebSocket();
  const [selectedTable, setSelectedTable] = useState<string>('users');
  const [sqlQuery, setSqlQuery] = useState<string>('');
  const [queryResult, setQueryResult] = useState<TableData | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // Check admin access
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-red-600">Access Denied</CardTitle>
            <CardDescription>You don't have permission to access the admin dashboard.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Fetch table data
  const { data: tableData, isLoading, refetch } = useQuery({
    queryKey: [`/api/admin/table/${selectedTable}`],
    enabled: !!selectedTable
  });

  // Listen for real-time updates and refresh table data
  useEffect(() => {
    if (lastMessage && lastMessage.type === 'database_update') {
      refetch();
    }
  }, [lastMessage, refetch]);

  // Execute custom SQL query
  const sqlMutation = useMutation({
    mutationFn: async (query: string) => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status}: ${errorText}`);
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      setQueryResult(data);
    },
    onError: (error) => {
      console.error('SQL execution error:', error);
    }
  });

  // Delete record mutation
  const deleteMutation = useMutation({
    mutationFn: async ({ table, id }: { table: string; id: number }) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/table/${table}/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status}: ${errorText}`);
      }
      
      return await response.json();
    },
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: [`/api/admin/table/${selectedTable}`] });
    }
  });

  const handleExecuteSQL = () => {
    if (sqlQuery.trim()) {
      setIsExecuting(true);
      sqlMutation.mutate(sqlQuery);
      setIsExecuting(false);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this record? This action cannot be undone.')) {
      deleteMutation.mutate({ table: selectedTable, id });
    }
  };

  const handleEdit = (rowIndex: number, columnIndex: number, newValue: string) => {
    // Implementation for inline editing
    console.log('Edit cell:', rowIndex, columnIndex, newValue);
  };

  const exportData = () => {
    if (tableData) {
      const csvContent = [
        tableData.columns.join(','),
        ...tableData.rows.map(row => row.map(cell => `"${cell || ''}"`).join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedTable}_export.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Database className="w-8 h-8 text-blue-600" />
            Admin Dashboard
          </h1>
          <p className="text-gray-600 mt-2">Complete system administration and database management</p>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          {user.username} - Administrator
        </Badge>
      </div>

      <Tabs value={selectedTable} onValueChange={setSelectedTable} className="space-y-6">
        {/* Table Selection Tabs */}
        <div className="bg-white p-4 rounded-lg border">
          <TabsList className="grid grid-cols-6 w-full">
            {Object.entries(TABLE_CONFIGS).map(([key, config]) => {
              const IconComponent = config.icon;
              return (
                <TabsTrigger key={key} value={key} className="flex items-center gap-2">
                  <IconComponent className="w-4 h-4" />
                  <span className="hidden sm:inline">{config.name}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {/* Table Content */}
        {Object.entries(TABLE_CONFIGS).map(([key, config]) => (
          <TabsContent key={key} value={key}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <config.icon className="w-5 h-5" />
                      {config.name}
                    </CardTitle>
                    <CardDescription>{config.description}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => refetch()}>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Refresh
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportData}>
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : tableData ? (
                  <div className="space-y-4">
                    <div className="text-sm text-gray-600">
                      Total records: {tableData.count}
                    </div>
                    <ScrollArea className="h-96 w-full border rounded">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {tableData.columns.map((column, index) => (
                              <TableHead key={index} className="font-semibold">
                                {column}
                              </TableHead>
                            ))}
                            <TableHead className="w-20">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tableData.rows.map((row, rowIndex) => (
                            <TableRow key={rowIndex}>
                              {row.map((cell, cellIndex) => (
                                <TableCell key={cellIndex} className="max-w-xs truncate">
                                  {cell !== null && cell !== undefined ? String(cell) : '-'}
                                </TableCell>
                              ))}
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleEdit(rowIndex, 0, '')}
                                    className="text-blue-600 hover:text-blue-800 h-6 w-6 p-0"
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleDelete(row[0])}
                                    className="text-red-600 hover:text-red-800 h-6 w-6 p-0"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* SQL Query Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Custom SQL Query
          </CardTitle>
          <CardDescription>
            Execute custom SQL queries directly on the database. Use with caution.
            <br />
            <span className="text-red-600 font-medium">⚠️ Important: Use single quotes (') for strings, not double quotes (")</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="space-y-2">
              <Input
                placeholder="Enter SQL query (e.g., SELECT * FROM users WHERE role = 'patient')"
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                className="font-mono"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    handleExecuteSQL();
                  }
                }}
              />
              <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                <div className="font-semibold mb-1">Quick Examples:</div>
                <div className="space-y-1">
                  <div>• <code>SELECT * FROM users WHERE role = 'patient'</code></div>
                  <div>• <code>UPDATE users SET username = 'newname' WHERE id = 6</code></div>
                  <div>• <code>INSERT INTO users (username, email) VALUES ('test', 'test@email.com')</code></div>
                  <div>• <code>DELETE FROM emergency_requests WHERE status = 'completed'</code></div>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleExecuteSQL} 
                disabled={!sqlQuery.trim() || isExecuting}
                className="flex-1"
              >
                {isExecuting ? 'Executing...' : 'Execute Query (Ctrl+Enter)'}
              </Button>
              <Button 
                onClick={() => setSqlQuery("SELECT * FROM users WHERE role = 'patient' LIMIT 5")}
                variant="outline"
                size="sm"
              >
                Example
              </Button>
            </div>
          </div>

          {queryResult && (
            <div className="space-y-2">
              <h4 className="font-semibold">Query Result:</h4>
              <div className="text-sm text-gray-600">
                Returned {queryResult.rows.length} rows
              </div>
              <ScrollArea className="h-64 w-full border rounded">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {queryResult.columns.map((column, index) => (
                        <TableHead key={index} className="font-semibold">
                          {column}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {queryResult.rows.map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <TableCell key={cellIndex} className="max-w-xs truncate">
                            {cell !== null && cell !== undefined ? String(cell) : '-'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}