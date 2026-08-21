import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { FerryCompany } from "@shared/schema";

const FerryCompanies = () => {
  const { data: companies, isLoading } = useQuery<FerryCompany[]>({
    queryKey: ['/api/ferry-companies'],
  });

  const activeCompanies = companies?.filter(company => company.isActive);

  return (
    <section className="py-16 bg-neutral-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-neutral-800 mb-4">Ferry Operators</h2>
          <p className="text-neutral-600 max-w-2xl mx-auto">We partner with the best ferry companies to provide you with a wide range of options</p>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="bg-white p-6 rounded-lg shadow-md border border-neutral-200 flex items-center justify-center">
                <div className="h-12 w-36 bg-neutral-200 animate-pulse rounded"></div>
              </Card>
            ))}
          </div>
        ) : activeCompanies && activeCompanies.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {activeCompanies.map((company) => (
              <Card 
                key={company.id} 
                className="bg-white p-6 rounded-lg shadow-md border border-neutral-200 flex items-center justify-center hover:shadow-lg transition duration-300"
              >
                {company.logo ? (
                  <img 
                    src={company.logo}
                    alt={company.name} 
                    className="h-12" 
                  />
                ) : (
                  <div className="h-12 flex items-center justify-center font-bold text-primary text-lg">
                    {company.name}
                  </div>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-neutral-600">No ferry companies available at the moment. Please check back later.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default FerryCompanies;
