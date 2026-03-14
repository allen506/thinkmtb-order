"use client";

import { useState, useEffect, useCallback } from "react";
import OrderForm from "@/components/OrderForm";
import PasswordGate from "@/components/PasswordGate";

interface UserTotal {
  userName: string;
  items: {
    productName: string;
    designName: string;
    sizeName: string;
    quantity: number;
    unitPriceUSD: number;
    totalUSD: number;
  }[];
  grandTotalUSD: number;
}

interface TotalsData {
  userTotals: UserTotal[];
  teamTotalUSD: number;
  teamTotalItems: number;
}

export default function Home() {
  const [totals, setTotals] = useState<TotalsData | null>(null);
  const [loadingTotals, setLoadingTotals] = useState(true);

  const fetchTotals = useCallback(() => {
    fetch("/api/orders/user-totals")
      .then((res) => res.json())
      .then((data) => {
        setTotals(data);
        setLoadingTotals(false);
      })
      .catch(() => setLoadingTotals(false));
  }, []);

  useEffect(() => {
    fetchTotals();
  }, [fetchTotals]);

  return (
    <PasswordGate password="thinkmtb-go" storageKey="auth-main" title="ThinkMTB Team Orders">
    <div>
      <div className="text-center mb-8 bg-gray-900 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 rounded-xl">
        <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2">
          🚴 ThinkMTB Team Order
        </h1>
        <p className="text-lg text-gray-300">
          Place your order for custom CMS Sportswear jerseys and vests
        </p>
        <p className="text-sm text-gray-400 mt-1">
          Products by{" "}
          <a
            href="https://www.cmssportswear.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            CMS Sportswear
          </a>
        </p>
      </div>

      <OrderForm onOrderPlaced={fetchTotals} />

      {/* Team Order Summary */}
      <div className="max-w-4xl mx-auto mt-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            📊 Team Order Summary
          </h2>

          {loadingTotals ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : !totals || totals.userTotals.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No orders placed yet. Be the first to order!
            </p>
          ) : (
            <>
              {/* Team totals banner */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex flex-wrap gap-4 sm:gap-6">
                  <div>
                    <p className="text-xs sm:text-sm text-green-600 font-medium">Total Team Items</p>
                    <p className="text-xl sm:text-2xl font-bold text-green-800">{totals.teamTotalItems}</p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-green-600 font-medium">Team Total (USD)</p>
                    <p className="text-xl sm:text-2xl font-bold text-green-800">
                      ${totals.teamTotalUSD.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-green-600 font-medium">Riders</p>
                    <p className="text-xl sm:text-2xl font-bold text-green-800">{totals.userTotals.length}</p>
                  </div>
                </div>
              </div>

              {/* Per-user breakdown */}
              <div className="space-y-4">
                {totals.userTotals.map((user, idx) => (
                  <div
                    key={idx}
                    className="border border-gray-200 rounded-lg overflow-hidden"
                  >
                    <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                      <h3 className="font-semibold text-gray-800">
                        {user.userName}
                      </h3>
                      <span className="text-sm font-bold text-green-700 bg-green-100 px-3 py-1 rounded-full">
                        ${user.grandTotalUSD.toFixed(2)}
                      </span>
                    </div>
                    <div className="px-4 py-2 overflow-x-auto">
                      <table className="w-full text-sm min-w-[480px]">
                        <thead>
                          <tr className="text-gray-500 text-xs uppercase">
                            <th className="py-1 text-left">Product</th>
                            <th className="py-1 text-left">Design</th>
                            <th className="py-1 text-left">Size</th>
                            <th className="py-1 text-right">Qty</th>
                            <th className="py-1 text-right">Unit $</th>
                            <th className="py-1 text-right">Total $</th>
                          </tr>
                        </thead>
                        <tbody>
                          {user.items.map((item, i) => (
                            <tr key={i} className="border-t border-gray-100">
                              <td className="py-1.5 text-gray-800">{item.productName}</td>
                              <td className="py-1.5 text-gray-600">{item.designName}</td>
                              <td className="py-1.5 text-gray-600">{item.sizeName}</td>
                              <td className="py-1.5 text-right text-gray-800">{item.quantity}</td>
                              <td className="py-1.5 text-right text-gray-600">
                                ${item.unitPriceUSD.toFixed(2)}
                              </td>
                              <td className="py-1.5 text-right font-medium text-gray-800">
                                ${item.totalUSD.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-400 mt-4 text-center">
                Prices are based on current total team quantity per product type and may change as more orders come in.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
    </PasswordGate>
  );
}
