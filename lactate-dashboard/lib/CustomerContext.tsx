'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

interface Customer {
  customer_id: string
  name: string
  email?: string
  phone?: string
  date_of_birth?: string
  height_cm?: number
  weight_kg?: number
  notes?: string
  created_at?: string
  updated_at?: string
}

interface CustomerContextType {
  selectedCustomer: Customer | null;
  setSelectedCustomer: (customer: Customer | null) => void;
  selectedSessionId: string | null;
  setSelectedSessionId: (sessionId: string | null) => void;
  dataVersion: number;
  refreshData: () => void;
}

const CustomerContext = createContext<CustomerContextType | undefined>(
  undefined
);

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  );
  const [dataVersion, setDataVersion] = useState(0);

  const refreshData = () => setDataVersion((prevVersion) => prevVersion + 1);

  // Reset session when customer changes
  const handleSetSelectedCustomer = (customer: Customer | null) => {
    setSelectedCustomer(customer)
    if (!customer || customer.customer_id !== selectedCustomer?.customer_id) {
      setSelectedSessionId(null)
    }
  };

  return (
    <CustomerContext.Provider
      value={{
        selectedCustomer,
        setSelectedCustomer: handleSetSelectedCustomer,
        selectedSessionId,
        setSelectedSessionId,
        dataVersion,
        refreshData,
      }}
    >
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomer() {
  const context = useContext(CustomerContext)
  if (context === undefined) {
    throw new Error('useCustomer must be used within a CustomerProvider')
  }
  return context
}

export type { Customer }