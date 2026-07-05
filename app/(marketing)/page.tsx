import { HeroSection } from '@/components/landing/hero-section'
import { SocialProof } from '@/components/landing/social-proof'
import { FeaturesSection } from '@/components/landing/features-section'
import { StatsSection } from '@/components/landing/stats-section'
import { HowItWorks } from '@/components/landing/how-it-works'
import { TestimonialsSection } from '@/components/landing/testimonials-section'
import { PricingSection } from '@/components/landing/pricing-section'
import { FaqSection } from '@/components/landing/faq-section'

export default function MarketingHomePage() {
  return (
    <>
      <HeroSection />
      <SocialProof />
      <FeaturesSection />
      <StatsSection />
      <HowItWorks />
      <TestimonialsSection />
      <PricingSection />
      <FaqSection />
    </>
  )
}
