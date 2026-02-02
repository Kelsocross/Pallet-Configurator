import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ProjectInfo } from "@/lib/types";

interface ProjectInfoFormProps {
  info: ProjectInfo;
  onChange: (field: keyof ProjectInfo, value: string) => void;
}

export function ProjectInfoForm({ info, onChange }: ProjectInfoFormProps) {
  return (
    <Card className="shadow-sm border-primary/20">
      <CardHeader className="bg-muted/30 pb-3">
        <CardTitle className="text-base font-semibold tracking-tight flex items-center gap-2">
          <span className="w-2 h-6 bg-primary rounded-full"></span>
          Customer / Project Info
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="customerName">Customer Name</Label>
          <Input 
            id="customerName" 
            value={info.customerName} 
            onChange={(e) => onChange("customerName", e.target.value)}
            placeholder="Acme Corp"
            className="bg-background/50"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="projectName">Project Name / Number</Label>
          <Input 
            id="projectName" 
            value={info.projectName} 
            onChange={(e) => onChange("projectName", e.target.value)}
            placeholder="P-2024-001"
            className="bg-background/50"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactName">Contact / PM Name</Label>
          <Input 
            id="contactName" 
            value={info.contactName} 
            onChange={(e) => onChange("contactName", e.target.value)}
            placeholder="Jane Doe"
            className="bg-background/50"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customerOrderNumber">Customer Order Number</Label>
          <Input 
            id="customerOrderNumber" 
            value={info.customerOrderNumber} 
            onChange={(e) => onChange("customerOrderNumber", e.target.value)}
            placeholder="ORD-12345"
            className="bg-background/50"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customerOrderQty">Customer Order Qty</Label>
          <Input 
            id="customerOrderQty" 
            value={info.customerOrderQty} 
            onChange={(e) => onChange("customerOrderQty", e.target.value)}
            placeholder="1000"
            className="bg-background/50"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="packOutQty">Pack Out Qty</Label>
          <Input 
            id="packOutQty" 
            value={info.packOutQty} 
            onChange={(e) => onChange("packOutQty", e.target.value)}
            placeholder="50"
            className="bg-background/50"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea 
            id="notes" 
            value={info.notes} 
            onChange={(e) => onChange("notes", e.target.value)}
            placeholder="Additional shipping requirements or constraints..."
            className="bg-background/50 min-h-[80px]"
          />
        </div>
      </CardContent>
    </Card>
  );
}
