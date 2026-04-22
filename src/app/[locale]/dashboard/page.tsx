import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Coins, Zap, Shield, BarChart3 } from "lucide-react"

export default function DashboardPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome back, Commander</h1>
        <p className="text-muted-foreground">Here's what's happening with your enterprise tokens today.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Tokens" value="1,284,500" change="+12.5%" icon={Coins} />
        <StatCard title="Active Users" value="14,209" change="+3.1%" icon={Zap} />
        <StatCard title="Security Alerts" value="0" change="-100%" icon={Shield} />
        <StatCard title="Volume (24h)" value="$45,230" change="+18.2%" icon={BarChart3} />
      </div>

      <div className="grid gap-6">
        <Card className="border-none bg-gradient-to-br from-blue-600/10 via-background to-background">
          <CardHeader>
            <CardTitle>System Performance</CardTitle>
            <CardDescription>Network status and real-time processing metrics.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center border-t border-dashed border-white/10">
            <span className="text-muted-foreground text-sm">[Chart Placeholder - Ready for Recharts implementation]</span>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({ title, value, change, icon: Icon }: any) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" /> box-border
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">
          <span className={cn("text-emerald-500 font-medium", change.startsWith('-') && "text-red-500")}>
            {change}
          </span> from last month
        </p>
      </CardContent>
    </Card>
  )
}

// Helper simple cn to avoid imports for now
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ")
}
