import React, { useState } from "react";

export function Tabs({ children, defaultValue, className }) {
  const [activeTab, setActiveTab] = useState(defaultValue);

  // Filtra apenas os TabsTrigger e TabsContent dos filhos
  const triggers = React.Children.toArray(children).filter(
    (child) => child.type === TabsTrigger
  );
  const contents = React.Children.toArray(children).filter(
    (child) => child.type === TabsContent
  );

  return (
    <div className={`w-full ${className || ""}`}>
      <TabsList>
        {triggers.map((trigger) =>
          React.cloneElement(trigger, {
            isActive: trigger.props.value === activeTab,
            onClick: () => setActiveTab(trigger.props.value),
          })
        )}
      </TabsList>
      <div className="mt-4">
        {contents.map((content) =>
          content.props.value === activeTab ? content : null
        )}
      </div>
    </div>
  );
}

export function TabsList({ children }) {
  return (
    <div className="flex border-b border-gray-700">
      {children}
    </div>
  );
}

export function TabsTrigger({ children, value, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
        isActive
          ? "border-blue-500 text-white"
          : "border-transparent text-gray-400 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

export function TabsContent({ children, value }) {
  return <div className="text-white">{children}</div>;
}
