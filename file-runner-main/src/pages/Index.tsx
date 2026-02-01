import { CleaningPricingWidget } from '@/components/cleaning/CleaningPricingWidget';
import { Helmet } from 'react-helmet-async';

const Index = () => {
  return (
    <>
      <Helmet>
        <title>Nancy's Cleaning Services | Instant House Cleaning Pricing & Booking</title>
        <meta
          name="description"
          content="Get instant pricing for professional house cleaning in Santa Barbara & Ventura. Book full home cleanings, deep cleaning, move-out cleaning and recurring maid service online."
        />
        <meta
          name="keywords"
          content="house cleaning, cleaning service, maid service, Santa Barbara, Ventura, deep clean, move out cleaning, home cleaning pricing"
        />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="Nancy's Cleaning Services" />
        <link rel="canonical" href="https://nancyshousekeepingservice.com/price/" />
      </Helmet>
      <main>
        <CleaningPricingWidget />
      </main>
    </>
  );
};

export default Index;
