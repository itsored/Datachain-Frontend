"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useMarketplace } from "@/hooks/useMarketplace"
import { useIncentives } from "@/hooks/useIncentives"
import { useWeb3Context } from "@/components/web3-provider"
import { RatingModal } from "@/components/rating-modal"
import { useToast } from "@/hooks/use-toast"
import { Wallet, Star, Gift, Database, Loader2 } from "lucide-react"

export default function DashboardPage() {
  const { isConnected, account } = useWeb3Context()
  const { datasets, pendingWithdrawal, withdraw } = useMarketplace()
  const { pendingRewards, balance, claimReward, loading: rewardsLoading } = useIncentives()
  const { toast } = useToast()

  const [withdrawing, setWithdrawing] = useState(false)
  const [ratingModalOpen, setRatingModalOpen] = useState(false)
  const [selectedSeller, setSelectedSeller] = useState<string | null>(null)

  // Mock purchased datasets (in a real app, this would come from events or subgraph)
  const [purchasedDatasets] = useState([
    { id: 1, seller: "0x1234567890123456789012345678901234567890", price: "0.1" },
    { id: 2, seller: "0x0987654321098765432109876543210987654321", price: "0.05" },
  ])

  const ownedDatasets = datasets.filter((dataset) => dataset.seller.toLowerCase() === account?.toLowerCase())

  const handleWithdraw = async () => {
    setWithdrawing(true)
    try {
      await withdraw()
      toast({
        title: "Withdrawal Successful",
        description: "Funds have been withdrawn to your wallet",
      })
    } catch (error: any) {
      toast({
        title: "Withdrawal Failed",
        description: error.message || "Failed to withdraw funds",
        variant: "destructive",
      })
    } finally {
      setWithdrawing(false)
    }
  }

  const handleClaimRewards = async () => {
    try {
      await claimReward()
      toast({
        title: "Rewards Claimed",
        description: "Rewards have been claimed successfully!",
      })
    } catch (error: any) {
      toast({
        title: "Claim Failed",
        description: error.message || "Failed to claim rewards",
        variant: "destructive",
      })
    }
  }

  const openRatingModal = (sellerAddress: string) => {
    setSelectedSeller(sellerAddress)
    setRatingModalOpen(true)
  }

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
              <p className="text-muted-foreground">Connect your wallet to view your dashboard.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
        <p className="text-muted-foreground">Manage your datasets, earnings, and rewards</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Withdrawal</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingWithdrawal} ETH</div>
            <Button
              onClick={handleWithdraw}
              disabled={withdrawing || Number.parseFloat(pendingWithdrawal) === 0}
              className="w-full mt-2"
              size="sm"
            >
              {withdrawing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Withdrawing...
                </>
              ) : (
                "Withdraw"
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Rewards</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRewards} ETH</div>
            <Button
              onClick={handleClaimRewards}
              disabled={rewardsLoading || Number.parseFloat(pendingRewards) === 0}
              className="w-full mt-2"
              size="sm"
            >
              {rewardsLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Claiming...
                </>
              ) : (
                "Claim Rewards"
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Token Balance</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{balance} DCT</div>
            <p className="text-xs text-muted-foreground mt-2">DataChain Tokens</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="seller" className="space-y-6">
        <TabsList>
          <TabsTrigger value="seller">Seller View</TabsTrigger>
          <TabsTrigger value="buyer">Buyer View</TabsTrigger>
        </TabsList>

        <TabsContent value="seller" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                My Listed Datasets
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ownedDatasets.length === 0 ? (
                <div className="text-center py-8">
                  <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No datasets listed</h3>
                  <p className="text-muted-foreground">Start by listing your first dataset in the marketplace</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {ownedDatasets.map((dataset) => (
                    <div key={dataset.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-semibold">Dataset #{dataset.id}</h3>
                        <p className="text-sm text-muted-foreground font-mono">{dataset.ipfsHash}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{dataset.price} ETH</p>
                        <Badge variant="secondary">Active</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="buyer" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Purchased Datasets</CardTitle>
            </CardHeader>
            <CardContent>
              {purchasedDatasets.length === 0 ? (
                <div className="text-center py-8">
                  <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No purchases yet</h3>
                  <p className="text-muted-foreground">Browse the marketplace to find datasets for your projects</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {purchasedDatasets.map((purchase) => (
                    <div key={purchase.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-semibold">Dataset #{purchase.id}</h3>
                        <p className="text-sm text-muted-foreground">
                          Seller: {purchase.seller.slice(0, 6)}...{purchase.seller.slice(-4)}
                        </p>
                      </div>
                      <div className="text-right space-y-2">
                        <p className="font-bold">{purchase.price} ETH</p>
                        <Button size="sm" variant="secondary" onClick={() => openRatingModal(purchase.seller)}>
                          Rate Seller
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <RatingModal sellerAddress={selectedSeller} open={ratingModalOpen} onOpenChange={setRatingModalOpen} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
