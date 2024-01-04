export interface IProject {
    id: number;
    description: string;
    createdAt: string;
}

export interface IUseProjectsProps {
    projects: IProject[];
    loading: boolean;
    errors: Error | undefined;
}
  