import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Database, Shield, Coins, Users } from "lucide-react"

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="text-center mb-12 md:mb-16">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 px-2">Decentralized AI Training Data Marketplace</h1>
        <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 md:mb-8 max-w-2xl mx-auto px-4">
          Buy and sell high-quality AI training datasets on the blockchain. Transparent, secure, and decentralized.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/market">Browse Datasets</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
            <Link href="/list">List Your Data</Link>
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        <Card>
          <CardHeader>
            <Database className="h-8 w-8 text-primary mb-2" />
            <CardTitle>Quality Data</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Access verified, high-quality datasets for your AI projects</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Shield className="h-8 w-8 text-primary mb-2" />
            <CardTitle>Secure & Private</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Blockchain-based transactions with privacy-preserving features</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Coins className="h-8 w-8 text-primary mb-2" />
            <CardTitle>Fair Pricing</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Transparent pricing with smart contract automation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Users className="h-8 w-8 text-primary mb-2" />
            <CardTitle>Community Driven</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Reputation system and community governance</p>
          </CardContent>
        </Card>
      </div>

      <div className="text-center px-4">
        <h2 className="text-xl sm:text-2xl font-bold mb-6 md:mb-4">How It Works</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 max-w-4xl mx-auto">
          <div>
            <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
              1
            </div>
            <h3 className="font-semibold mb-2">List Your Dataset</h3>
            <p className="text-muted-foreground">Upload your dataset metadata to IPFS and list it on our marketplace</p>
          </div>
          <div>
            <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
              2
            </div>
            <h3 className="font-semibold mb-2">Browse & Purchase</h3>
            <p className="text-muted-foreground">
              Discover datasets, check seller reputation, and make secure purchases
            </p>
          </div>
          <div>
            <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
              3
            </div>
            <h3 className="font-semibold mb-2">Rate & Earn</h3>
            <p className="text-muted-foreground">Rate your experience and earn rewards for quality contributions</p>
          </div>
        </div>
      </div>
    </div>
  )
}
