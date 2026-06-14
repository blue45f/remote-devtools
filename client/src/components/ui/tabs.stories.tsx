import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';

import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'UI/Tabs',
  component: Tabs,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="w-[520px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="replay">Replay</TabsTrigger>
        <TabsTrigger value="timeline">Timeline</TabsTrigger>
        <TabsTrigger value="raw">Raw JSON</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <p className="text-sm text-fg-muted">
          Aggregated session metadata: started at, device, page, user.
        </p>
      </TabsContent>
      <TabsContent value="replay">
        <p className="text-sm text-fg-muted">rrweb player goes here.</p>
      </TabsContent>
      <TabsContent value="timeline">
        <p className="text-sm text-fg-muted">CDP event timeline.</p>
      </TabsContent>
      <TabsContent value="raw">
        <p className="text-sm font-mono text-fg-muted">{`{ "id": 142 }`}</p>
      </TabsContent>
    </Tabs>
  ),
};

export const WithDisabled: Story = {
  render: () => (
    <Tabs defaultValue="a">
      <TabsList>
        <TabsTrigger value="a">Active</TabsTrigger>
        <TabsTrigger value="b">Open</TabsTrigger>
        <TabsTrigger value="c" disabled>
          Disabled
        </TabsTrigger>
      </TabsList>
      <TabsContent value="a">A</TabsContent>
      <TabsContent value="b">B</TabsContent>
    </Tabs>
  ),
};
