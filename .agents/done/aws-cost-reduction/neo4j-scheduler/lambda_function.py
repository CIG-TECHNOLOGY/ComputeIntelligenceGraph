import boto3
import os

ec2 = boto3.client('ec2', region_name='us-east-2')
INSTANCE_ID = os.environ['INSTANCE_ID']

def handler(event, context):
    action = event.get('action', 'stop')

    if action == 'stop':
        response = ec2.stop_instances(InstanceIds=[INSTANCE_ID])
        state = response['StoppingInstances'][0]['CurrentState']['Name']
        print(f"neo4j {INSTANCE_ID}: stopping → {state}")
        return {'action': 'stop', 'instanceId': INSTANCE_ID, 'state': state}

    elif action == 'start':
        response = ec2.start_instances(InstanceIds=[INSTANCE_ID])
        state = response['StartingInstances'][0]['CurrentState']['Name']
        print(f"neo4j {INSTANCE_ID}: starting → {state}")
        return {'action': 'start', 'instanceId': INSTANCE_ID, 'state': state}

    else:
        raise ValueError(f"Unknown action: {action}. Use 'start' or 'stop'.")
