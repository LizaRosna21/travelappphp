import { Card, CardContent } from "@/components/ui/card";

interface StatItem {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}

interface DashboardStatsProps {
  stats: StatItem[];
}

const DashboardStats = ({ stats }: DashboardStatsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-neutral-500">{stat.title}</p>
                <p className="text-3xl font-bold mt-1">{stat.value}</p>
                <p className="text-xs text-neutral-500 mt-1">{stat.description}</p>
              </div>
              <div className="p-2 bg-neutral-100 rounded-md">
                {stat.icon}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DashboardStats;
